// Global variables for JWT and user data
let authToken = null;
let currentUser = null;

// Function to fetch JWT from the server (dhl_login)
async function fetchAuthToken() {
    // This function should only be called if not on the main landing page
    // and the user is expected to be session-authenticated.
    try {
        const response = await fetch('/api/auth/issue-jwt-for-session'); // Relative to dhl_login server
        if (!response.ok) {
            if (response.status === 401) {
                console.error('[Debug] fetchAuthToken: Session not authenticated to get JWT (401). User should be redirected to login by server.');
                // Potentially redirect or show message if server doesn't auto-redirect for /app/*
                // window.location.href = '/login-page'; // Or let ensureWebAuthenticated handle it
            } else {
                console.error(`[Debug] fetchAuthToken: Failed to fetch JWT. Status: ${response.status}, Text: ${response.statusText}`);
            }
            return; // Stop if token fetch failed
        }
        const data = await response.json();
        authToken = data.token;
        currentUser = data.user;
        console.log('[Debug] fetchAuthToken: JWT acquired successfully for user:', currentUser.username);

        // Auto-populate Associate Name field if it exists and is empty
        populateAssociateName();
    } catch (error) {
        console.error('[Debug] fetchAuthToken: Error acquiring JWT:', error);
    }
}

// Function to auto-populate Associate Name field
function populateAssociateName() {
    // Only populate if we have user data with firstName and lastName
    if (!currentUser || !currentUser.firstName || !currentUser.lastName) {
        console.log('[Debug] populateAssociateName: No user data or missing name fields');
        return;
    }

    // Look for the Associate Name input field (id="name")
    const nameField = document.getElementById('name');
    if (!nameField) {
        console.log('[Debug] populateAssociateName: No name field found on this page');
        return;
    }

    // Only populate if the field is empty (don't overwrite existing data)
    if (nameField.value && nameField.value.trim() !== '') {
        console.log('[Debug] populateAssociateName: Name field already has value, not overwriting');
        return;
    }

    // Populate with firstName + lastName
    const fullName = `${currentUser.firstName} ${currentUser.lastName}`;
    nameField.value = fullName;
    console.log('[Debug] populateAssociateName: Auto-populated name field with:', fullName);
}


// Global variable for current date
let currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

document.addEventListener("DOMContentLoaded", function() {
    console.log('[Debug] DOMContentLoaded event fired.');
    // Elements for the landing page
    const landingPageMenu = document.querySelector("#landing-page-menu");

    // If on a checklist page (not the main index.html menu), try to fetch the JWT
    if (!landingPageMenu && window.location.pathname.startsWith('/app/') && window.location.pathname !== '/app/index.html') {
        fetchAuthToken();

        // Also try to populate name field after a short delay in case auth token is already available
        setTimeout(() => {
            populateAssociateName();
        }, 500);
    }

    // Form Elements
    const nameInput = document.getElementById("name");
    const dateDisplay = document.getElementById("date-display");
    const commentsTextarea = document.getElementById("comments");
    const addCommentsButton = document.querySelector(".button input[value='Add Comments']");
    const submitButton = document.querySelector(".button input[value='Submit']");
    const commentsSection = document.querySelector(".comments");
    //const auditorNameInput = document.getElementById("auditorName");
    const taskContainer = document.querySelector(".task-container");

    // Set current date automatically in the display
    if (dateDisplay) {
        dateDisplay.textContent = currentDate;
    }

    // List of checklist filenames
    const checklists = [
        "checklists/1_A_Cell_West_Side_Daily.html",
        "checklists/2_A_Cell_East_Side_Daily.html",
        "checklists/3_B_Cell_West_Side_Daily.html",
        "checklists/4_B_Cell_East_Side_Daily.html",
        "checklists/5_C_Cell_West_Side_Daily.html",
        "checklists/6_C_Cell_East_Side_Daily.html",
        "checklists/7_D_Cell_West_Side_Daily.html",
        "checklists/8_D_Cell_East_Side_Daily.html",
        "checklists/9_E_Cell_West_Side_Daily.html",
        "checklists/10_E_Cell_East_Side_Daily.html",
        "checklists/11_F_Cell_West_Side_Daily.html",
        "checklists/12_F_Cell_East_Side_Daily.html",
        "checklists/13_All_Cells_Weekly.html",
        "checklists/14_All_Cells_Weekly.html",
        "checklists/15_A&B_Cells_LL_Quarterly.html",
        "checklists/16_D_Cell_LL_Quarterly.html",
        "checklists/17_A_Cell_High_Level_Quarterly.html",
        "checklists/18_B_Cell_High_Level_Quarterly.html",
        "checklists/19_C_Cell_High_Level_Quarterly.html",
        "checklists/20_D_Cell_High_Level_Quarterly.html",
        "checklists/21_E_Cell_High_Level_Quarterly.html",
        "checklists/22_F_Cell_High_Level_Quarterly.html"
    ];

    // Generate checklist menu if on the landing page
    if (landingPageMenu) {
        checklists.forEach(checklist => {
            const listItem = document.createElement("li");
            const link = document.createElement("a");
            link.href = checklist;
            link.textContent = `Checklist # ${checklist.replace(".html", "").replace(/_/g, " ")}`;
            listItem.appendChild(link);
            landingPageMenu.appendChild(listItem);
        });
    }

    // --- Barcode/Scanner Functionality START ---
    console.log('[Debug] Attempting to get scannerInput element.');
    const scannerInput = document.getElementById('scannerInput');
    console.log('[Debug] scannerInput element found:', scannerInput);

    function handleScannerInput() {
        console.log('[Debug] handleScannerInput called.');
        if (!scannerInput) {
            console.log('[Debug] scannerInput is null or undefined in handleScannerInput. Aborting scanner setup.');
            return;
        }
        console.log('[Scanner] handleScannerInput initialized.');

        const messageArea = document.createElement('div');
        messageArea.id = 'scanner-message';
        messageArea.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 1000;
        `;
        document.body.appendChild(messageArea);
        messageArea.style.display = 'none';

        function showMessage(message, duration = 3000) {
            messageArea.textContent = message;
            messageArea.style.display = 'block';
            setTimeout(() => {
                messageArea.style.display = 'none';
            }, duration);
        }

        scannerInput.addEventListener('keydown', function(event) {
            console.log(`[Scanner] keydown event on scannerInput. Key: ${event.key}, Code: ${event.code}`); // Log any keydown
            if (event.key === 'Enter') {
                console.log('[Scanner] Enter key detected.');
                event.preventDefault(); // Prevent default form submission if any
                const scannedValue = scannerInput.value.trim();
                console.log('[Scanner] Scanned Value (trimmed):', scannedValue);

                if (scannedValue) {
                    console.log('[Scanner] Attempting to find checkbox with ID:', scannedValue);
                    const targetCheckbox = document.getElementById(scannedValue);
                    console.log('[Scanner] Result of getElementById:', targetCheckbox);
                    if (targetCheckbox && targetCheckbox.type === 'checkbox') {
                        targetCheckbox.checked = !targetCheckbox.checked;
                        console.log('[Scanner] Checkbox found and toggled:', targetCheckbox.id);

                        // Visual feedback
                        const parentElement = targetCheckbox.closest('div'); // Assuming checkbox is in a div
                        if (parentElement) {
                            parentElement.classList.add('highlight-scan');
                            setTimeout(() => {
                                parentElement.classList.remove('highlight-scan');
                            }, 1000); // Highlight for 1 second
                        }
                    } else {
                        console.warn("[Scanner] Scanned ID not found or not a checkbox:", scannedValue);
                        showMessage("Checkbox ID not found: " + scannedValue);
                    }
                }
                scannerInput.value = ""; // Clear input for next scan
                setTimeout(() => scannerInput.focus(), 0); // Re-focus for next scan, deferred slightly
                console.log('[Scanner] Re-focused on scannerInput after scan (using setTimeout).');
            }
        });

        scannerInput.addEventListener('blur', function(event) {
            console.log('[Debug] scannerInput BLUR event. Current activeElement:', document.activeElement, 'RelatedTarget (what gained focus, if available):', event.relatedTarget);
            // If focus is lost to something other than itself, try to refocus.
            // This check helps prevent potential infinite loops if refocusing itself triggers another blur.
            if (document.activeElement !== scannerInput) {
                console.log('[Debug] scannerInput lost focus to something else. Attempting to re-focus scannerInput.');
                // scannerInput.focus(); // Intentionally commented out to allow focus on other fields
                console.log('[Debug] Active element after trying to re-focus scannerInput in blur handler (scannerInput.focus() is now commented out):', document.activeElement);
            }
        });
        // DELAYED Initial focus
        setTimeout(() => {
            console.log('[Debug] Attempting DELAYED focus on scannerInput (after 200ms).');
            scannerInput.focus();
            console.log('[Scanner] DELAYED Initial focus set on scannerInput.');
            console.log('[Debug] Active element immediately after DELAYED scannerInput.focus():', document.activeElement);
        }, 200);
    }

    // Call scanner setup if not on landing page
    // (assuming scannerInput will only exist on checklist pages)
    if (scannerInput) {
        handleScannerInput(); // This will now set up listeners and the delayed focus
        setTimeout(() => {
            // This log will now effectively check ~300ms after the delayed focus attempt
            console.log('[Debug] Active element 500ms after handleScannerInput call (and ~300ms after delayed focus attempt):', document.activeElement);
        }, 500);
    } else {
        console.log('[Debug] scannerInput element was not found in DOMContentLoaded. Scanner not initialized.');
    }
    // --- Barcode/Scanner Functionality END ---

    // Function to gather checkbox states
    function getCheckboxStates() {
        const sections = document.querySelectorAll('section');
        const checkboxData = {}; // This will be the nested object

        sections.forEach(section => {
            // Get the heading text of the section, assuming h2 or h3
            const headingElement = section.querySelector('h2, h3');
            const headingText = headingElement ? headingElement.textContent.trim() : 'Unnamed Section'; // Fallback for sections without headings

            checkboxData[headingText] = {}; // Create an entry for the heading

            const checkboxesInSection = section.querySelectorAll('input[type="checkbox"]:not(.select-all)');
            if (checkboxesInSection.length > 0) {
                checkboxesInSection.forEach(checkbox => {
                    if (checkbox.id) { // Ensure the checkbox has an ID
                        let labelText = checkbox.id; // Default to ID if no label is found
                        const labelElement = section.querySelector(`label[for="${checkbox.id}"]`); // Search label within the section
                        if (labelElement) {
                            labelText = labelElement.textContent.trim();
                        }
                        // Store checkbox data under its heading
                        checkboxData[headingText][checkbox.id] = {
                            checked: checkbox.checked,
                            label: labelText
                        };
                    } else {
                        console.warn("Checkbox found without an ID within section:", headingText, checkbox);
                    }
                });
            } else {
            }
        });
        return checkboxData;
    }

    // Validate Form
    function validateForm() {
        let isValid = true;
        if (nameInput && nameInput.value.trim() === "") {
            alert("Name is required.");
            isValid = false;
        }
        // Date validation removed - date is automatically set
        return isValid;
    }

    // Email validation helper function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.toLowerCase());
    }

    // Add Comment
    function addComment() {
        if (commentsTextarea && commentsTextarea.value.trim() !== "") {
            const newComment = document.createElement("p");
            newComment.textContent = commentsTextarea.value;
            commentsSection.appendChild(newComment);
            commentsTextarea.value = ""; // Clear the textarea
        } else {
            alert("Please enter a comment before adding.");
        }
    }

    // Function to redirect to the user's dashboard
    function goToMenu() {
        window.location.href = "/dashboard";
    }

    // Mark Assignment as Completed
    function markAssignmentCompleted() {
        // Extract checklist filename from the current page URL
        const currentPath = window.location.pathname;
        const filename = currentPath.split('/').pop(); // Get the last part of the path (filename)

        console.log('[Debug] markAssignmentCompleted: Current path:', currentPath, 'Filename:', filename);

        if (!filename || !filename.endsWith('.html')) {
            console.error('Could not determine checklist filename from URL:', currentPath);
            return Promise.resolve(); // Don't fail the whole process
        }

        if (!authToken) {
            console.error('Auth token not available for markAssignmentCompleted.');
            return Promise.resolve(); // Don't fail the whole process
        }

        console.log('[Debug] markAssignmentCompleted: Calling API to complete assignment for:', filename);

        return fetch('/api/assignments/complete-checklist', { // Relative URL to DHL login server
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` // Use the same auth token
            },
            body: JSON.stringify({
                checklistFilename: filename
            })
        })
        .then(async response => {
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to mark assignment as completed. Status: ${response.status}, Response: ${errorText}`);
                // Don't throw error - we don't want to prevent the user from continuing
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                console.log('Assignment marked as completed:', data);
                alert('Assignment marked as completed: ' + data.message);
            }
        })
        .catch((error) => {
            console.error('Error marking assignment as completed:', error);
            // Don't throw error - we don't want to prevent the user from continuing
        });
    }

    // Save Data to Backend
    function saveData() {
        // Extract checklist filename from the current page URL
        const currentPath = window.location.pathname;
        const filename = currentPath.split('/').pop(); // Get the last part of the path (filename)

        const data = {
            title: document.title,
            name: nameInput.value,
            date: currentDate, // Use the automatically set current date
            checkboxes: getCheckboxStates(),
            comments: commentsTextarea.value,
            //auditorName: auditorNameInput.value,
            //supervisorName: supervisorName.value,
            supervisorEmail: "sendral.ts.1@pg.com",
            checklistFilename: filename, // Add the checklist filename
            userId: currentUser ? currentUser.id : null // Add the user ID
        };

        if (!authToken) {
            alert('Authentication token is not available. Please ensure you are properly logged in.');
            console.error('Auth token not available for saveData.');
            return Promise.reject(new Error('Auth token not available.')); // Prevent submission
        }

        return fetch('/backend/submit-form', { // Proxied by nginx to backend API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` // Add JWT to Authorization header
            },
            body: JSON.stringify(data)
        })
        .then(async response => { // Made this an async function
            if (!response.ok) {
                // Log more details from the response
                const errorText = await response.text(); // Attempt to get error text from server
                console.error(`[Debug] saveData: Network response was not ok. Status: ${response.status}, StatusText: ${response.statusText}, ServerResponse: ${errorText}`);
                throw new Error(`Network response was not ok. Status: ${response.status}. Server message: ${errorText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            alert(data.message); // Provide user feedback

            // After successfully saving checklist data, mark assignment as completed
            console.log('[Debug] saveData: About to call markAssignmentCompleted()');
            return markAssignmentCompleted();
        })
        .catch((error) => {
            console.error('[Debug] saveData: Error caught in fetch chain:', error.message, error);
            // Display a more informative error if possible, or fall back to generic
            const displayError = error.message.includes("Server message:") ? error.message : 'An error occurred while submitting the form. Check console for details.';
            alert(displayError);
            throw error; // Propagate the error for further handling
        });
    }

    // Event Listener for Add Comments Button
    if (addCommentsButton) {
        addCommentsButton.addEventListener("click", function(event) {
            event.preventDefault(); // Prevent default action if it's a submit button
            if (validateForm()) {
                addComment(); // Add the comment only, do not save form data
            }
        });
    }

    // Event Listener for Submit Button
    if (submitButton) {
        submitButton.addEventListener("click", function(event) {
            event.preventDefault(); // Prevent default form submission
            if (validateForm()) {
                submitButton.disabled = true; // Disable the button to prevent multiple clicks
                saveData().then(() => {
                    goToMenu(); // Redirect to the menu page after saving data
                }).catch(() => {
                    submitButton.disabled = false; // Re-enable the button on failure
                });
            }
        });
    }

    // Event listener for the Back/Menu button
    //const backButton = document.getElementById("backButton");
    //if (backButton) {
    //    backButton.addEventListener("click", function() {
    //        window.location.href = "index.html"; // Replace with the correct URL of your landing page
    //    });
    //}

    // Select All Functionality (inside DOMContentLoaded)
    //document.querySelectorAll('.select-all').forEach(selectAllRadio => {
    //    selectAllRadio.addEventListener('change', function(event) {
    //        const section = event.target.closest('.section');
    //        if (section) { // Ensure section exists
    //            const checkboxes = section.querySelectorAll('input[type="checkbox"]:not(.select-all)');
    //            checkboxes.forEach(checkbox => {
    //                checkbox.checked = true;
//                });
//            }
//        });
//
});

