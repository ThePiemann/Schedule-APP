/* src/script/weather.js */

document.addEventListener('DOMContentLoaded', () => {
    initWeather();
    
    const retryBtn = document.getElementById('retryLocationBtn');
    const cancelBtn = document.getElementById('closeLocationModal');
    
    if (retryBtn) { 
        retryBtn.addEventListener('click', () => { 
            hideLocationModal(); 
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
    if (isEnabled) { attemptFetchWeather(false); } else { hideWeatherWidget(); }
}

function handleWeatherToggle(isChecked) {
    const toggle = document.getElementById('settingWeatherToggle');
    if (isChecked) {
        if (toggle) toggle.disabled = true;
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (toggle) { toggle.disabled = false; toggle.checked = true; }
                    localStorage.setItem('isWeatherEnabled', 'true');
                    
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    
                    fetchWeather(lat, lon);
                    fetchLocationName(lat, lon); // New Call
                    showWeatherWidget();
                },
                (err) => {
                    console.warn("Location access denied.");
                    if (toggle) { toggle.disabled = false; toggle.checked = false; }
                    localStorage.setItem('isWeatherEnabled', 'false');
                    hideWeatherWidget();
                    showLocationModal();
                }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
            if (toggle) { toggle.disabled = false; toggle.checked = false; }
        }
    } else {
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
                fetchLocationName(pos.coords.latitude, pos.coords.longitude); // New Call
            },
            (err) => { 
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

// NEW: Reverse Geocoding to get City/Country
function fetchLocationName(lat, lon) {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            const city = data.city || data.locality || "Local Weather";
            const country = data.countryName || "";
            
            const display = document.getElementById('weatherCity');
            if(display) {
                if(country) display.innerText = `${city}, ${country}`;
                else display.innerText = city;
            }
        })
        .catch(err => console.error("Location lookup failed", err));
}

function renderWeather(data) {
    const temp = Math.round(data.temperature);
    const code = data.weathercode;
    const isDay = data.is_day === 1;

    document.getElementById('weatherTemp').innerText = `${temp}°`;
    document.getElementById('weatherDesc').innerText = getWeatherDescription(code);
    document.getElementById('weatherIcon').innerText = getWeatherIcon(code, isDay);
    
    // Note: weatherCity is updated by fetchLocationName now

    updateWeatherTheme(isDay, code);
}

function updateWeatherTheme(isDay, code) {
    const card = document.querySelector('.weather-card');
    if(!card) return;

    let gradient = '';

    if (isDay) {
        if (code >= 95) gradient = 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)'; 
        else if (code >= 51) gradient = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'; 
        else if (code >= 1 && code <= 3) gradient = 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)'; 
        else gradient = 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)'; 
        
        if (code === 0) gradient = 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)'; 
    } else {
        if (code >= 95) gradient = 'linear-gradient(135deg, #1f2937 0%, #000000 100%)'; 
        else if (code >= 51) gradient = 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)'; 
        else gradient = 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)'; 
    }

    card.style.background = gradient;
}

function showWeatherWidget() { const el = document.getElementById('weatherContainer'); if(el) el.classList.remove('hidden'); }
function hideWeatherWidget() { const el = document.getElementById('weatherContainer'); if(el) el.classList.add('hidden'); }
function showLocationModal() { const modal = document.getElementById('locationModal'); if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); } }
function hideLocationModal() { const modal = document.getElementById('locationModal'); if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } }

function getWeatherDescription(code) {
    const codes = { 0: 'Sunny', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle', 61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 80: 'Rain Showers', 81: 'Showers', 82: 'Violent Showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Heavy Thunderstorm' };
    return codes[code] || 'Unknown';
}

function getWeatherIcon(code, isDay = true) {
    if (code === 0) return isDay ? 'sunny' : 'bedtime'; 
    if (code >= 1 && code <= 3) return isDay ? 'partly_cloudy_day' : 'nights_stay';
    if (code >= 45 && code <= 48) return 'foggy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'weather_snowy';
    if (code >= 80 && code <= 82) return 'rainy';
    if (code >= 95) return 'thunderstorm';
    return 'cloud';
}
