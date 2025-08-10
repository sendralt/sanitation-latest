console.log("[Debug] server.js: Server starting with latest code...");
require('dotenv').config(); // Ensure this is at the very top

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const cors = require('cors');
const path = require('path');
const fs = require('fs');  // Import the file system module


const nodemailer = require('nodemailer');  // Import nodemailer for sending emails

const app = express();
const port = process.env.PORT || 3001; // Use environment variable for port

// Export the app for testing purposes
module.exports = app;

// --- JWT Authentication Setup ---
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET, // Ensure JWT_SECRET is in backend/.env
};

passport.use(new JwtStrategy(jwtOptions, (jwt_payload, done) => {
  // jwt_payload will contain { userId, username, firstName, lastName } from the token
  // We trust the dhl_login server as the issuer. No need to re-query User DB here.
  // The 'user' object for protected routes will be the jwt_payload.
  if (jwt_payload && jwt_payload.userId) {
    return done(null, jwt_payload); // Pass the payload as req.user
  } else {
    return done(null, false, { message: 'Invalid token payload.' });
  }
}));

// Middleware
app.use(passport.initialize()); // Initialize Passport
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow requests from all origins
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
// Serve static files
console.log('Registering static file middleware...');
app.use(express.static(path.join(__dirname, '../Public')));
console.log('Serving static files from:', path.join(__dirname, '../Public'));


// Directory where data will be stored
const dataDir = path.join(__dirname, 'data');

// Helper function to select 20% of the checkboxes
function getRandomCheckboxes(checkboxesByHeading) {
    const headingKeys = Object.keys(checkboxesByHeading);
    const candidateCheckboxIds = [];

    // Step 1: Collect all itemIDs from under the headings
    for (const heading in checkboxesByHeading) {
        if (Object.hasOwnProperty.call(checkboxesByHeading, heading)) {
            const itemsUnderHeading = checkboxesByHeading[heading];
            if (typeof itemsUnderHeading === 'object' && itemsUnderHeading !== null) {
                for (const itemId in itemsUnderHeading) {
                    if (Object.hasOwnProperty.call(itemsUnderHeading, itemId)) {
                        candidateCheckboxIds.push(itemId);
                    }
                }
            }
        }
    }

    // Step 2: Filter out any candidate ID that is also a heading key
    const eligibleCheckboxIds = candidateCheckboxIds.filter(id => !headingKeys.includes(id));

    if (eligibleCheckboxIds.length === 0) {
        return []; // No eligible checkboxes to select from
    }

    const totalEligibleCheckboxes = eligibleCheckboxIds.length;
    // Ensure selectedCount is at least 1 if there are eligible checkboxes, but not more than available.
    let selectedCount = Math.ceil(totalEligibleCheckboxes * 0.20);
    selectedCount = Math.max(1, selectedCount); // Select at least 1 if possible
    selectedCount = Math.min(selectedCount, totalEligibleCheckboxes); // Don't try to select more than available


    // Fisher-Yates shuffle to get a random selection without duplicates
    const shuffledIds = [...eligibleCheckboxIds];
    for (let i = shuffledIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
    }

    return shuffledIds.slice(0, selectedCount);
}

// Function to save data to a file
function saveDataToFile(data, filePath) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save form data to a file using the provided filePath
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log(`Data saved to ${filePath}`);
        }
    });
}

// Endpoint to handle form submissions
// Define authenticateApi middleware for protecting routes
const authenticateApi = passport.authenticate('jwt', { session: false });

app.post('/submit-form', authenticateApi, async (req, res) => {
    const formData = req.body;


    console.log('Received Data:', formData);

    if (!formData.title) {
        return res.status(400).json({ error: "Page title is missing from the submission." });
    }

    if (!formData.checkboxes || typeof formData.checkboxes !== 'object') {
        return res.status(400).json({ error: "Checkboxes data is missing or invalid." });
    }

    const supervisorEmail = formData.supervisorEmail;

    // Validate supervisorEmail
    if (!supervisorEmail) {
        return res.status(400).json({ error: 'Supervisor email is required' });
    }

    // Generate a single timestamp for both the file name and the email link
    const timestamp = Date.now();
    const filename = `data_${timestamp}.json`;

    // Get random 20% checkboxes
    const randomCheckboxes = getRandomCheckboxes(formData.checkboxes);

    // Add randomCheckboxes to formData
    formData.randomCheckboxes = randomCheckboxes;

    // Save the modified formData (including randomCheckboxes) to a file
    const filePath = path.join(dataDir, filename);
    saveDataToFile(formData, filePath);

    try {
        // Update the assignment with the submission data file path
        const { Assignment, Checklist, User } = require('../dhl_login/models');

        // Use the checklist filename and userId from the request body
        const checklistFilename = formData.checklistFilename;
        const userId = formData.userId;

        if (checklistFilename && userId) {
            try {
                // First find the checklist by filename
                const checklist = await Checklist.findOne({
                    where: { filename: checklistFilename }
                });

                if (checklist) {
                    // Then find the assignment
                    const assignment = await Assignment.findOne({
                        where: {
                            userId: userId,
                            checklistId: checklist.id,
                            completedAt: null,
                            status: 'assigned'
                        },
                        order: [['assignedAt', 'DESC']]
                    });

                    if (assignment) {
                        await assignment.update({
                            submissionDataFilePath: filename
                        });
                        console.log(`Updated assignment ${assignment.id} with submission data file path: ${filename}`);
                    } else {
                        console.warn(`No active assignment found for user ${userId} and checklist ${checklistFilename}`);
                    }
                } else {
                    console.warn(`Checklist not found with filename: ${checklistFilename}`);
                }
            } catch (error) {
                console.error('Error updating assignment with submission data file path:', error);
            }
        } else {
            if (!checklistFilename) console.warn('No checklist filename provided in form data');
            if (!userId) console.warn('No userId provided in form data');
        }
    } catch (error) {
        console.error('Error updating assignment with submission data file path:', error);
        // Don't fail the submission if this update fails
    }

    // Send an email to the supervisor with the same timestamp in the checklist link
    // BASE_URL should point to the dhl_login server (e.g., https://dot1hundred.com)
    const baseUrl = process.env.BASE_URL || `https://dot1hundred.com`;
    const checklistUrl = `${baseUrl}/app/validate-checklist/${timestamp}`; // Link to UI served by dhl_login


    // Pass formData.title as the checklistTitle
    sendEmailToSupervisor(supervisorEmail, checklistUrl, filename, formData.title, (emailError) => {
        if (emailError) {
            console.error('Failed to send email:', emailError);
            return res.status(500).json({ error: 'Failed to send email. Please try again.' });
        }

        // If everything is successful, send a success response
        res.status(200).json({ message: 'Form submitted and email sent!' });
    });
});

// Send an email to the supervisor with a checklist link, filename, and title
function sendEmailToSupervisor(supervisorEmail, checklistUrl, filename, checklistTitle, callback) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: supervisorEmail,
        subject: `Sanitation Checklist for Review: ${checklistTitle}`, // Add title to subject
        html: `<p>A new checklist "<b>${checklistTitle}</b>" (Filename: ${filename}) requires your validation. Click <a href="${checklistUrl}">here</a> to review.</p>` // Add title and filename to body, make link text "here"
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Failed to send email:', error);
            return callback(error);
        } else {
            console.log('Email sent: ' + info.response);////////////////////
            return callback(null);
        }
    });
}

// Route to handle GET /validate/:id (load the validation page)
app.get('/validate/:id', authenticateApi, (req, res) => {
    // Deprecated: validation endpoints have been consolidated in dhl_login
    return res.status(410).json({ message: 'This endpoint has moved. Please use /api/validate/:id on the auth server.' });
});


// POST route to handle supervisor validation form submission
app.post('/validate/:id', authenticateApi, async (req, res) => {
    console.log(`[Debug] POST /validate/:id - START - ID: ${req.params.id}`);
    const fileId = req.params.id;
    const validationData = req.body;

    // Read the original checklist data
    const filePath = path.join(dataDir, `data_${fileId}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Checklist not found.' });
    }
    // Read the original checklist data from the file
    const fileData = fs.readFileSync(filePath, 'utf8');
    const formData = JSON.parse(fileData);

    // Update checkboxes based on the validation data (both checked and unchecked)
    validationData.validatedCheckboxes.forEach((validatedCb) => {
        const { id: validatedId, checked: newCheckedState } = validatedCb;
        let itemUpdated = false;
        // Iterate through headings to find the validated checkbox ID
        for (const headingKey in formData.checkboxes) {
            if (formData.checkboxes[headingKey] && formData.checkboxes[headingKey][validatedId]) {
                // Update the 'checked' status of the specific checkbox item
                formData.checkboxes[headingKey][validatedId].checked = newCheckedState;
                itemUpdated = true;
                break; // Found and updated, no need to check other headings for this ID
            }
        }
        if (!itemUpdated) {
            console.warn(`Validated checkbox ID ${validatedId} not found in original checklist data under any heading.`);
        }
    });

    // Add supervisor feedback to the formData
    formData.supervisorValidation = {
        supervisorName: validationData.supervisorName,
        validatedCheckboxes: validationData.validatedCheckboxes.reduce((acc, cb) => {
            acc[cb.id] = cb.checked;
            return acc;
        }, {})
    };

    // Save the updated checklist data back to the file
    fs.writeFileSync(filePath, JSON.stringify(formData, null, 2));

    try {
        // Update the assignment status to 'validated'
        const { Assignment, User } = require('../dhl_login/models');
        const filename = `data_${fileId}.json`;

        // Find the assignment by the submission data file path
        const assignment = await Assignment.findOne({
            where: {
                submissionDataFilePath: filename,
                status: 'completed'
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'firstName', 'lastName']
            }]
        });

        if (assignment) {
            // Find the supervisor user by name (this is a simplified approach)
            const supervisor = await User.findOne({
                where: {
                    // Try to match by first name and last name combination
                    // This is a basic implementation - you might want to improve this matching logic
                    firstName: validationData.supervisorName.split(' ')[0] || validationData.supervisorName,
                    isAdmin: true // Assuming supervisors are admin users
                }
            });

            await assignment.update({
                status: 'validated',
                validatedAt: new Date(),
                validatedByUserId: supervisor ? supervisor.id : null,
                validationStatus: 'approved' // Assuming validation means approval
            });

            console.log(`Assignment ${assignment.id} marked as validated by supervisor: ${validationData.supervisorName}`);
        } else {
            console.warn(`No assignment found with submission data file path: ${filename}`);
        }
    } catch (error) {
        console.error('Error updating assignment validation status:', error);
        // Don't fail the validation if this update fails
    }

    res.status(200).json({ message: 'Validation completed successfully.' });
    console.log(`[Debug] POST /validate/:id - END - ID: ${req.params.id}`);
});

// --- UNAUTHENTICATED VALIDATION ROUTES FOR SUPERVISORS ---
// These routes allow supervisors to access validation functionality without JWT authentication

// Unauthenticated GET route for supervisor validation (load the validation page data)
app.get('/validate-public/:id', (req, res) => {
    return res.status(410).json({ message: 'This endpoint has moved. Please use /api/validate/:id on the auth server.' });
});

// Unauthenticated POST route for supervisor validation form submission
app.post('/validate-public/:id', async (req, res) => {
    // Deprecated: validation endpoints have been consolidated in dhl_login
    return res.status(410).json({ message: 'This endpoint has moved. Please use /api/validate/:id on the auth server.' });
});

// Endpoint to view the checklist data in the browser
app.get('/view-checklist/:id', authenticateApi, (req, res) => {
    const fileId = req.params.id;  // Get the unique ID from the URL (timestamp)

    // Construct the file path based on the ID
    const filePath = path.join(dataDir, `data_${fileId}.json`);

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        const formData = JSON.parse(fileData);

        // Send the formData as JSON response
        res.json(formData);
    } else {
        // If the file does not exist, send a 404 error
        res.status(404).send('Checklist not found.');
    }
});

// Endpoint to view the checklist data in a readable HTML format
app.get('/view-checklist-html/:id', authenticateApi, (req, res) => {
    const fileId = req.params.id;  // Get the unique ID from the URL (timestamp)

    // Construct the file path based on the ID
    const filePath = path.join(dataDir, `data_${fileId}.json`);

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        const formData = JSON.parse(fileData);

        // Create an HTML response
        let htmlContent = `
            <html>
                <head>
                    <title>Checklist Data</title>
                </head>
                <body>
                    <h1>Checklist Data for ${fileId}</h1>
                    <pre>${JSON.stringify(formData, null, 2)}</pre>
                </body>
            </html>
        `;

        res.send(htmlContent);
    } else {
        // If the file does not exist, send a 404 error
        res.status(404).send('Checklist not found.');
    }
});



// Health check endpoint for Docker
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'backend-api'
    });
});

// Start the server
console.log('Attempting to start server...');
const server = app.listen(port, '0.0.0.0', () => { // Use the port variable
    console.log('Backend API Server listener callback executed.');
    console.log(`Backend API Server is running on http://localhost:${port}`);
});

server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(`[FATAL] ${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`[FATAL] ${bind} is already in use. Is another instance of the backend or another application using this port?`);
            process.exit(1);
            break;
        default:
            console.error(`[FATAL] Server startup error: ${error.code}`, error);
            throw error;
    }
});

//app.listen(port, () => {
//    console.log(`Server is running on http://localhost:${port}`);
//});

