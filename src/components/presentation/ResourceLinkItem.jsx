'use client';
import { Button } from '@/components/ui/button';
import { ExternalLink, Code, Folder, Video, Link as LinkIcon, FileText } from 'lucide-react';
import LinkBadge from '@/components/ui/LinkBadge';
import { isEmbeddable, getLinkType } from '@/lib/utils';
import { cn } from '@/lib/utils'; // Assuming cn exists or similar

const ResourceLinkItem = ({
    url,
    label,
    type,
    active,
    onShow,
    className
}) => {
    if (!url) return null;

    const linkType = type || getLinkType(url);
    const embeddable = isEmbeddable(url, linkType);

    // Determine Icon
    let Icon = LinkIcon;
    let iconColor = "text-slate-400";

    // Simple mapping for list view icons (distinct from Badge icons)
    // Simple mapping for list view icons (distinct from Badge icons)
    if (linkType === 'code' || linkType === 'GitHub' || linkType === 'GitLab') { Icon = Code; iconColor = "text-green-400"; }
    else if (linkType === 'storage' || linkType === 'Google Drive' || linkType === 'OneDrive') { Icon = Folder; iconColor = "text-purple-400"; }
    else if (linkType === 'video' || linkType === 'YouTube' || linkType === 'Vimeo') { Icon = Video; iconColor = "text-red-400"; }
    else if (linkType === 'pdf' || linkType === 'document' || linkType === 'Word' || linkType === 'Google Docs' || linkType === 'presentation') { Icon = FileText; iconColor = "text-blue-400"; }

    // Display Label fallback
    const displayLabel = label || linkType || 'Resource';

    return (
        <div className={cn(
            "flex items-center justify-between p-2 rounded-lg border transition-colors",
            active ? "bg-blue-600/20 border-blue-500/50" : "bg-slate-800/50 border-white/5",
            className
        )}>
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                <span className="text-sm truncate text-slate-300">{displayLabel}</span>
                {/* Optional: Show Badge if space prompts or if desired, but maybe overkill for sidebar? */}
                {/* <LinkBadge url={url} className="hidden sm:flex scale-75 origin-left" /> */}
            </div>

            <div className="flex gap-1 shrink-0 ml-2">
                {embeddable && onShow && (
                    <Button
                        size="xs"
                        variant="ghost"
                        className="h-6 text-xs bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white"
                        onClick={() => onShow(url)}
                    >
                        Show
                    </Button>
                )}
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-6 w-6 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Open in New Tab"
                >
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </div>
    );
};

export default ResourceLinkItem;
