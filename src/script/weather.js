/* --------------------------
   WEATHER & LOCATION LOGIC
   -------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    initWeather();
    const retryBtn = document.getElementById('retryLocationBtn');
    const cancelBtn = document.getElementById('closeLocationModal');
    if (retryBtn) { retryBtn.addEventListener('click', () => { hideLocationModal(); const toggle = document.getElementById('settingWeatherToggle'); if (toggle) { toggle.checked = true; handleWeatherToggle(true); } }); }
    if (cancelBtn) { cancelBtn.addEventListener('click', hideLocationModal); }
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
                    fetchWeather(pos.coords.latitude, pos.coords.longitude);
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
            (pos) => { showWeatherWidget(); fetchWeather(pos.coords.latitude, pos.coords.longitude); },
            (err) => { console.log("Weather enabled but permission missing."); hideWeatherWidget(); }
        );
    }
}

function fetchWeather(lat, lon) {
    // API Call (includes is_day)
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
    const isDay = data.is_day === 1; // 1 = Day, 0 = Night

    document.getElementById('weatherTemp').innerText = `${temp}°`;
    document.getElementById('weatherDesc').innerText = getWeatherDescription(code);
    document.getElementById('weatherIcon').innerText = getWeatherIcon(code, isDay); // Pass isDay for icon variation if needed
    document.getElementById('weatherCity').innerText = "Local Weather";

    // Dynamic Background Update
    updateWeatherTheme(isDay, code);
}

function updateWeatherTheme(isDay, code) {
    const card = document.querySelector('.weather-card');
    if(!card) return;

    let gradient = '';

    if (isDay) {
        // DAY THEMES
        if (code >= 95) gradient = 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)'; // Storm (Dark Gray)
        else if (code >= 51) gradient = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'; // Rain (Blue)
        else if (code >= 1 && code <= 3) gradient = 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)'; // Cloudy (Light Blue)
        else gradient = 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)'; // Clear (Sunny/Gold) - Adjusted to be warmer
        
        // Actually, let's keep the standard "Blue/Purple" brand but adjust brightness
        if (code === 0) gradient = 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)'; // Bright Clear
    } else {
        // NIGHT THEMES
        if (code >= 95) gradient = 'linear-gradient(135deg, #1f2937 0%, #000000 100%)'; // Night Storm
        else if (code >= 51) gradient = 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)'; // Night Rain
        else gradient = 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)'; // Night Clear (Deep Indigo)
    }

    // Apply
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
    // Optional: Return moon icons if !isDay, but standard google font weather icons are generic
    if (code === 0) return isDay ? 'sunny' : 'bedtime'; // Sun vs Moon
    if (code >= 1 && code <= 3) return isDay ? 'partly_cloudy_day' : 'nights_stay';
    if (code >= 45 && code <= 48) return 'foggy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'weather_snowy';
    if (code >= 80 && code <= 82) return 'rainy';
    if (code >= 95) return 'thunderstorm';
    return 'cloud';
}