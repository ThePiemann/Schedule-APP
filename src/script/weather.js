/* --------------------------
   WEATHER & LOCATION LOGIC
   -------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    initWeather();
    
    // Bind Modal Buttons
    const retryBtn = document.getElementById('retryLocationBtn');
    const cancelBtn = document.getElementById('closeLocationModal');
    
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            hideLocationModal();
            // Retry the toggle flow
            const toggle = document.getElementById('settingWeatherToggle');
            if (toggle) {
                toggle.checked = true;
                handleWeatherToggle(true);
            }
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideLocationModal);
    }
});

function initWeather() {
    const isEnabled = localStorage.getItem('isWeatherEnabled') === 'true';
    const toggle = document.getElementById('settingWeatherToggle');
    
    if (toggle) toggle.checked = isEnabled;

    if (isEnabled) {
        attemptFetchWeather(false); 
    } else {
        hideWeatherWidget();
    }
}

function handleWeatherToggle(isChecked) {
    const toggle = document.getElementById('settingWeatherToggle');

    if (isChecked) {
        // LOCK TOGGLE
        if (toggle) toggle.disabled = true;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    // SUCCESS
                    if (toggle) {
                        toggle.disabled = false;
                        toggle.checked = true;
                    }
                    localStorage.setItem('isWeatherEnabled', 'true');
                    fetchWeather(pos.coords.latitude, pos.coords.longitude);
                    showWeatherWidget();
                },
                (err) => {
                    // DENIED/ERROR
                    console.warn("Location access denied.");
                    
                    if (toggle) {
                        toggle.disabled = false;
                        toggle.checked = false; // Turn back off
                    }
                    localStorage.setItem('isWeatherEnabled', 'false');
                    hideWeatherWidget();
                    
                    // Show Custom Modal
                    showLocationModal();
                }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
            if (toggle) {
                toggle.disabled = false;
                toggle.checked = false;
            }
        }
    } else {
        // Turn OFF
        localStorage.setItem('isWeatherEnabled', 'false');
        hideWeatherWidget();
    }
}

function attemptFetchWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                showWeatherWidget();
                fetchWeather(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                // Silent fail on init
                console.log("Weather enabled but permission missing.");
                hideWeatherWidget();
            }
        );
    }
}

function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if(data.current_weather) {
                renderWeather(data.current_weather);
            }
        })
        .catch(err => console.error("Weather fetch failed", err));
}

function renderWeather(data) {
    const temp = Math.round(data.temperature);
    const code = data.weathercode;
    
    document.getElementById('weatherTemp').innerText = `${temp}°`;
    document.getElementById('weatherDesc').innerText = getWeatherDescription(code);
    document.getElementById('weatherIcon').innerText = getWeatherIcon(code);
    document.getElementById('weatherCity').innerText = "Local Weather";
}

function showWeatherWidget() {
    const el = document.getElementById('weatherContainer');
    if(el) el.classList.remove('hidden');
}

function hideWeatherWidget() {
    const el = document.getElementById('weatherContainer');
    if(el) el.classList.add('hidden');
}

/* --- Modal Helpers --- */
function showLocationModal() {
    const modal = document.getElementById('locationModal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function hideLocationModal() {
    const modal = document.getElementById('locationModal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/* --- Weather Helpers --- */
function getWeatherDescription(code) {
    const codes = {
        0: 'Sunny', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Rime Fog',
        51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
        61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
        71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
        80: 'Rain Showers', 81: 'Showers', 82: 'Violent Showers',
        95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Heavy Thunderstorm'
    };
    return codes[code] || 'Unknown';
}

function getWeatherIcon(code) {
    if (code === 0) return 'sunny';
    if (code >= 1 && code <= 3) return 'partly_cloudy_day';
    if (code >= 45 && code <= 48) return 'foggy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'weather_snowy';
    if (code >= 80 && code <= 82) return 'rainy';
    if (code >= 95) return 'thunderstorm';
    return 'cloud';
}