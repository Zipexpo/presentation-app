'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function ScoreBeeswarmViz({ reviews = [], width = 300, height = 150 }) {
    const svgRef = useRef(null);
    const simulationRef = useRef(null);
    const [displayData, setDisplayData] = useState([]);

    const margin = { top: 20, right: 30, bottom: 30, left: 30 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 1. Process Data & Preserve Physics State
    // 1. Process Data & Preserve Physics State
    useEffect(() => {
        // 1. Map raw data
        const mapped = reviews.map(r => {
            if (!r.scores || r.scores.length === 0) return null;
            const total = r.scores.reduce((acc, s) => acc + (s.score || 0), 0);
            const avg = total / r.scores.length;

            // Use reviewerId or guestId as stable identifier for the USER
            const stableId = r.reviewerId || r.guestId || r._id;

            return {
                id: stableId, // Key for D3 (User Identity)
                score: avg,
                userType: r.userType || 'student',
                reviewerName: r.reviewerName,
                updatedAt: new Date(r.updatedAt || r.createdAt)
            };
        }).filter(d => d !== null && d.score > 0);

        // 2. Deduplicate: Keep latest per stableId
        const bestPerUser = new Map();
        mapped.forEach(item => {
            const existing = bestPerUser.get(item.id);
            if (!existing || item.updatedAt > existing.updatedAt) {
                bestPerUser.set(item.id, item);
            }
        });

        const newItems = Array.from(bestPerUser.values());

        setDisplayData(prev => {
            const prevMap = new Map(prev.map(d => [d.id, d]));
            return newItems.map(item => {
                const existing = prevMap.get(item.id);
                // Keep physics state (x, y, vx, vy)
                if (existing) {
                    return { ...item, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy };
                }
                // New Node: Fly in from top
                return {
                    ...item,
                    x: width / 2 + (Math.random() * 40 - 20),
                    y: -50
                };
            });
        });
    }, [reviews, width]);

    // 2. D3 Logic
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // B. Update Scales & Axis
        const xScale = d3.scaleLinear()
            .domain([0, 10])
            .range([0, innerWidth]);

        const colorScale = d3.scaleOrdinal()
            .domain(['teacher', 'student', 'guest'])
            .range(['#a855f7', '#3b82f6', '#10b981']);

        const xAxis = d3.axisBottom(xScale).ticks(5).tickSizeOuter(0);

        // Use existing groups
        svg.select(".axis-g")
            .call(xAxis)
            .attr("color", "#64748b")
            .select(".domain").attr("stroke", "#475569");

        // C. Setup/Update Simulation
        if (!simulationRef.current) {
            simulationRef.current = d3.forceSimulation()
                .force("collide", d3.forceCollide(5));
        }
        const simulation = simulationRef.current;

        // Update Simulation Forces
        simulation.force("x", d3.forceX(d => xScale(d.score)).strength(1));
        simulation.force("y", d3.forceY(innerHeight / 2).strength(0.1));

        // D. Update Nodes (Data Join)
        const nodesG = svg.select(".nodes-g");
        const circles = nodesG.selectAll("circle")
            .data(displayData, d => d.id);

        const t = svg.transition().duration(500);

        // Exit
        circles.exit()
            .transition(t)
            .attr("r", 0)
            .remove();

        // Enter
        const enterCircles = circles.enter()
            .append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", 0)
            .attr("fill", d => colorScale(d.userType))
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 1)
            .attr("opacity", 0.9)
            .call(enter => enter.transition(t).attr("r", 4));

        enterCircles.append("title")
            .text(d => `${d.reviewerName || 'Anonymous'}: ${d.score.toFixed(1)}`);

        // Merge
        const allCircles = circles.merge(enterCircles);

        // Update tooltip text
        allCircles.select("title")
            .text(d => `${d.reviewerName || 'Anonymous'}: ${d.score.toFixed(1)}`);

        // E. Restart Simulation
        simulation.nodes(displayData);
        simulation.alpha(1).restart();

        simulation.on("tick", () => {
            allCircles
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

    }, [displayData, innerWidth, innerHeight]); // Depend on calculated dims

    // Cleanup simulation
    useEffect(() => {
        return () => {
            if (simulationRef.current) simulationRef.current.stop();
        };
    }, []);

    if (displayData.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-xs text-slate-600 italic">
                Waiting for scores...
            </div>
        );
    }

    return (
        <svg ref={svgRef} width={width} height={height} className="overflow-visible block mx-auto">
            <g className="main-g" transform={`translate(${margin.left},${margin.top})`}>
                <g className="axis-g" transform={`translate(0,${innerHeight / 2 + 20})`} />
                <g className="nodes-g" />
            </g>
        </svg>
    );
}
