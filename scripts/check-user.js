
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    mustChangePassword: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false }
}, { strict: false }); // Strict false to see all fields

const User = mongoose.model('User', userSchema);

async function checkUser(email) {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is missing');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Connected to DB. Searching for ${email}...`);

        const user = await User.findOne({ email: new RegExp(email, 'i') });

        if (user) {
            console.log('User found:');
            console.log(`- ID: ${user._id}`);
            console.log(`- Email: ${user.email}`);
            console.log(`- Role: ${user.role}`);
            console.log(`- mustChangePassword: ${user.mustChangePassword}`);
            console.log(`- emailVerified: ${user.emailVerified}`);
            console.log(`- Raw:`, user.toObject());
        } else {
            console.log('User not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Please provide an email.');
} else {
    checkUser(email);
}
