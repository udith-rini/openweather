/* ================================================
   SkyPulse — app.js
   Weather & Air Quality Dashboard
   Uses OpenWeatherMap Free API
   ================================================ */

// ---- CONFIG ----
const API_BASE = 'https://api.openweathermap.org/data/2.5';
let API_KEY = localStorage.getItem('owm_api_key') || '';

// ---- WEATHER ICON MAP ----
const weatherIcons = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

function getWeatherIcon(code) {
  return weatherIcons[code] || '🌤️';
}

// ---- AQI INFO ----
const aqiInfo = {
  1: {
    label: 'Good',
    desc: 'Air quality is satisfactory. Enjoy your outdoor activities!',
    color: '#00e676',
    shadow: 'rgba(0, 230, 118, 0.3)',
    pct: 10,
  },
  2: {
    label: 'Fair',
    desc: 'Air quality is acceptable. Sensitive groups may experience minor issues.',
    color: '#ffee58',
    shadow: 'rgba(255, 238, 88, 0.3)',
    pct: 30,
  },
  3: {
    label: 'Moderate',
    desc: 'Some pollutants may affect sensitive individuals. Limit prolonged outdoor exertion.',
    color: '#ffa726',
    shadow: 'rgba(255, 167, 38, 0.3)',
    pct: 55,
  },
  4: {
    label: 'Poor',
    desc: 'Health effects possible for the general public. Reduce outdoor activities.',
    color: '#ef5350',
    shadow: 'rgba(239, 83, 80, 0.3)',
    pct: 78,
  },
  5: {
    label: 'Very Poor',
    desc: 'Health warnings. Avoid outdoor activities. Everyone may be affected.',
    color: '#ab47bc',
    shadow: 'rgba(171, 71, 188, 0.3)',
    pct: 95,
  },
};

// ---- DOM REFS ----
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const errorMsg = document.getElementById('error-msg');
const loading = document.getElementById('loading');
const dashboard = document.getElementById('dashboard');
const landing = document.getElementById('landing');
const apiModal = document.getElementById('api-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');

// ---- INIT ----
updateDateTime();
setInterval(updateDateTime, 1000);

if (!API_KEY) {
  apiModal.style.display = 'flex';
} else {
  apiModal.style.display = 'none';
}

// ---- SAVE API KEY ----
saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key || key.length < 10) {
    apiKeyInput.style.borderColor = '#ff6b6b';
    return;
  }
  API_KEY = key;
  localStorage.setItem('owm_api_key', key);
  apiModal.style.display = 'none';
});

// ---- SEARCH EVENTS ----
searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) fetchWeatherByCity(city);
});

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const city = cityInput.value.trim();
    if (city) fetchWeatherByCity(city);
  }
});

locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    () => {
      hideLoading();
      showError('Unable to retrieve your location. Please search manually.');
    }
  );
});

// ---- FETCH: BY CITY NAME ----
async function fetchWeatherByCity(city) {
  showLoading();
  try {
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
    );
    const geoData = await geoRes.json();

    if (!geoData.length) {
      throw new Error(`City "${city}" not found. Please check spelling.`);
    }

    const { lat, lon } = geoData[0];
    await fetchWeatherByCoords(lat, lon);
  } catch (err) {
    hideLoading();
    showError(err.message || 'Failed to fetch weather. Check your API key.');
  }
}

// ---- FETCH: BY COORDINATES ----
async function fetchWeatherByCoords(lat, lon) {
  showLoading();
  clearError();
  try {
    const [weatherRes, forecastRes, airRes] = await Promise.all([
      fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      fetch(`${API_BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      fetch(`${API_BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`),
    ]);

    if (!weatherRes.ok) {
      const errData = await weatherRes.json();
      throw new Error(errData.message || 'Invalid API key or request failed.');
    }

    const [weather, forecast, air] = await Promise.all([
      weatherRes.json(),
      forecastRes.json(),
      airRes.json(),
    ]);

    renderCurrentWeather(weather);
    renderAirQuality(air);
    renderForecast(forecast);
    renderHourly(forecast);

    showDashboard();
  } catch (err) {
    hideLoading();
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

// ---- RENDER: CURRENT WEATHER ----
function renderCurrentWeather(data) {
  document.getElementById('city-name').textContent = data.name;
  document.getElementById('country').textContent = `${data.sys.country} · ${formatDate(new Date())}`;
  document.getElementById('temperature').textContent = Math.round(data.main.temp);
  document.getElementById('feels-like').textContent = Math.round(data.main.feels_like);
  document.getElementById('weather-desc').textContent = data.weather[0].description;
  document.getElementById('weather-icon-big').textContent = getWeatherIcon(data.weather[0].icon);
  document.getElementById('humidity').textContent = `${data.main.humidity}%`;
  document.getElementById('wind').textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
  document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
  document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
  document.getElementById('sunrise').textContent = formatTime(data.sys.sunrise * 1000);
  document.getElementById('sunset').textContent = formatTime(data.sys.sunset * 1000);
}

// ---- RENDER: AIR QUALITY ----
function renderAirQuality(data) {
  const aqi = data.list[0].main.aqi;
  const comp = data.list[0].components;
  const info = aqiInfo[aqi];

  const circle = document.getElementById('aqi-circle');
  document.getElementById('aqi-value').textContent = aqi;
  document.getElementById('aqi-status').textContent = info.label;
  document.getElementById('aqi-status').style.color = info.color;
  document.getElementById('aqi-desc').textContent = info.desc;
  circle.style.borderColor = info.color;
  circle.style.boxShadow = `0 0 30px ${info.shadow}`;
  document.getElementById('aqi-value').style.color = info.color;

  // AQI Bar fill
  document.getElementById('aqi-bar-fill').style.width = `${info.pct}%`;

  // Pollutants
  document.getElementById('pm25').textContent = comp.pm2_5.toFixed(1);
  document.getElementById('pm10').textContent = comp.pm10.toFixed(1);
  document.getElementById('co').textContent = comp.co.toFixed(1);
  document.getElementById('no2').textContent = comp.no2.toFixed(1);
  document.getElementById('o3').textContent = comp.o3.toFixed(1);
  document.getElementById('so2').textContent = comp.so2.toFixed(1);
}

// ---- RENDER: 5-DAY FORECAST ----
function renderForecast(data) {
  // Group by day — pick the noon reading (or closest)
  const dailyMap = {};
  data.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toDateString();
    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = [];
    }
    dailyMap[dayKey].push(item);
  });

  const days = Object.values(dailyMap).slice(0, 5);
  const grid = document.getElementById('forecast-grid');
  grid.innerHTML = '';

  days.forEach((dayItems, i) => {
    // Pick midday or middle item
    const midItem = dayItems[Math.floor(dayItems.length / 2)];
    const date = new Date(midItem.dt * 1000);
    const temps = dayItems.map(d => d.main.temp);
    const maxTemp = Math.round(Math.max(...temps));
    const minTemp = Math.round(Math.min(...temps));
    const maxHumidity = Math.max(...dayItems.map(d => d.main.humidity));

    const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' });

    const card = document.createElement('div');
    card.className = 'forecast-day';
    card.innerHTML = `
      <span class="forecast-day-name">${dayName}</span>
      <span class="forecast-icon">${getWeatherIcon(midItem.weather[0].icon)}</span>
      <span class="forecast-desc">${midItem.weather[0].description}</span>
      <div class="forecast-temps">
        <span class="forecast-high">${maxTemp}°</span>
        <span class="forecast-low">${minTemp}°</span>
      </div>
      <span class="forecast-humidity">💧 ${maxHumidity}%</span>
    `;
    grid.appendChild(card);
  });
}

// ---- RENDER: HOURLY ----
function renderHourly(data) {
  const scroll = document.getElementById('hourly-scroll');
  scroll.innerHTML = '';

  const items = data.list.slice(0, 24);
  const now = Date.now();

  items.forEach((item, i) => {
    const date = new Date(item.dt * 1000);
    const isNow = i === 0;
    const timeStr = isNow ? 'Now' : date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });
    const rain = item.pop ? `${Math.round(item.pop * 100)}%` : '0%';

    const div = document.createElement('div');
    div.className = `hourly-item${isNow ? ' now' : ''}`;
    div.innerHTML = `
      <span class="hourly-time">${timeStr}</span>
      <span class="hourly-icon">${getWeatherIcon(item.weather[0].icon)}</span>
      <span class="hourly-temp">${Math.round(item.main.temp)}°</span>
      <span class="hourly-rain">🌧 ${rain}</span>
    `;
    scroll.appendChild(div);
  });
}

// ---- UI HELPERS ----
function showLoading() {
  loading.classList.remove('hidden');
  dashboard.classList.add('hidden');
  landing.classList.add('hidden');
  clearError();
}

function hideLoading() {
  loading.classList.add('hidden');
}

function showDashboard() {
  hideLoading();
  dashboard.classList.remove('hidden');
  landing.classList.add('hidden');
  // Animate in cards with staggered delay
  const cards = dashboard.querySelectorAll('.glass-card');
  cards.forEach((card, i) => {
    card.style.animationDelay = `${i * 0.1}s`;
  });
}

function showError(msg) {
  errorMsg.textContent = '⚠️ ' + msg;
  errorMsg.classList.remove('hidden');
}

function clearError() {
  errorMsg.classList.add('hidden');
  errorMsg.textContent = '';
}

// ---- DATE / TIME HELPERS ----
function updateDateTime() {
  const el = document.getElementById('current-datetime');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleString('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });
}
