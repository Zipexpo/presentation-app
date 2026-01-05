const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// Define minimal schema matching the file content to isolated testing
// OR better, import the model if I can run with babel-node. 
// Since environment is likely strict, I will try to use the raw code from Topic.js but I need to handle imports.
// Actually, I can rely on the app running and just add a log? No, I want to run a script.

// Simpler: I'll try to just import the model in a script that mimics the route.
// But Next.js models effectively prevent recompilation.

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // I need to redefine the schema here to test it effectively without Next.js overhead/imports
        // Copying schema definition from Topic.js roughly
        const surveyQuestionSchema = {
            type: { type: String, enum: ['choice', 'scale', 'rating', 'text', 'rubric', 'section', 'matrix'], default: 'choice' },
            question: { type: String },
            title: { type: String },
            weight: { type: Number, default: 1 },
            options: [{
                label: { type: String },
                score: { type: Number, default: 0 },
                columnLabel: String,
                baseScore: Number
            }],
            scaleConfig: {
                min: { type: Number, default: 1 },
                max: { type: Number, default: 5 },
                minLabel: String,
                maxLabel: String
            },
            textConfig: {
                maxScore: { type: Number, default: 0 }
            },
            rows: [{
                id: String,
                text: String,
                weight: { type: Number, default: 1 },
                cells: [{
                    label: String,
                    score: Number,
                    baseScore: Number,
                    columnLabel: String
                }]
            }],
            columns: [{
                label: String,
                baseScore: Number,
                score: Number
            }]
        };

        const topicSchema = new mongoose.Schema({
            title: { type: String, required: true },
            description: { type: String, required: true },
            teacherId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Simplified ref
            submissionDeadline: { type: Date, required: true },
            presentationDate: { type: Date, required: true },
            submissionConfig: {
                includeSourceCode: { type: Boolean, default: false },
                includeThumbnail: { type: Boolean, default: false },
                includeMaterials: { type: Boolean, default: false },
                includeGroupName: { type: Boolean, default: false },
                includeVideo: { type: Boolean, default: true },
                includePresentation: { type: Boolean, default: true },
                labels: {
                    sourceCode: { type: String, default: 'Source Code' },
                    thumbnail: { type: String, default: 'Thumbnail' },
                    materials: { type: String, default: 'Additional Materials' },
                    groupName: { type: String, default: 'Group Name' },
                    video: { type: String, default: 'Demo Video' },
                    presentation: { type: String, default: 'Presentation Slides' }
                }
            },
            resourceRequirements: [{
                label: { type: String, required: true },
                type: { type: String, enum: ['url', 'pdf', 'image', 'video', 'presentation'], default: 'url' },
                optional: { type: Boolean, default: false }
            }],
            presentationConfig: {
                durationPerProject: { type: Number, default: 10 },
                questionDuration: { type: Number, default: 5 },
                breakDuration: { type: Number, default: 2 },
                defaultResource: { type: String, default: 'presentation' },
                gradingType: { type: String, enum: ['rubric', 'survey'], default: 'rubric' },
                gradingRubric: [{
                    label: { type: String },
                    maxScore: { type: Number, default: 10 }
                }],
                surveyWeight: { type: Number, default: 1 },
                surveyQuestions: [surveyQuestionSchema],
                allowComments: { type: Boolean, default: true },
                allowGuest: { type: Boolean, default: false },
                maxCommentsPerProject: { type: Number, default: 0 },
                feedbackVisibility: {
                    teacher: { type: Boolean, default: true },
                    student: { type: Boolean, default: true },
                    guest: { type: Boolean, default: true }
                },
                specialEvaluationConfig: {
                    enabled: { type: Boolean, default: false },
                    weight: { type: Number, default: 1 },
                    evaluatorEmails: [{ type: String }],
                    surveyQuestions: [surveyQuestionSchema]
                }
            },
            activeSession: {
                status: { type: String, enum: ['idle', 'active', 'paused', 'completed'], default: 'idle' },
                currentPhase: { type: String, enum: ['presentation', 'qa', 'break'], default: 'presentation' },
                currentProjectId: { type: mongoose.Schema.Types.ObjectId },
                startTime: Date,
                pauseTime: Date,
            },
            invitedTeachers: [{ type: String }],
            classId: { type: mongoose.Schema.Types.ObjectId },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        });

        const Topic = mongoose.models.Topic || mongoose.model('Topic', topicSchema);

        console.log('Attempting to create topic...');

        const payload = {
            title: "Test Topic",
            description: "Test Desc",
            teacherId: new mongoose.Types.ObjectId(), // Mock ID
            submissionDeadline: new Date(),
            presentationDate: new Date(),
            submissionConfig: {
                includeSourceCode: false,
                includeThumbnail: false,
                includeMaterials: false,
                includeGroupName: false
            }
            // NO classId provided (replicates missing optional field)
            // NO presentationConfig
        };

        const t = await Topic.create(payload);
        console.log('Topic created successfully:', t._id);
        console.log('Presentation Config:', JSON.stringify(t.presentationConfig, null, 2));

    } catch (e) {
        console.error('ERROR CREATING TOPIC:', e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
