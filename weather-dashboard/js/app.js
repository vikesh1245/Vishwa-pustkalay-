/**
 * Weather Dashboard App
 * Main application logic
 */

class WeatherDashboardApp {
    constructor() {
        this.currentWeatherData = null;
        this.currentForecastData = null;
        this.searchTimeout = null;
        this.init();
    }

    /**
     * Initialize the app
     */
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.loadSavedCities();
        this.checkAPIKey();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        // Search elements
        this.cityInput = document.getElementById('cityInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.locationBtn = document.getElementById('locationBtn');
        this.suggestionsDiv = document.getElementById('suggestions');

        // UI elements
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.errorMsg = document.getElementById('errorMsg');
        this.errorCloseBtn = document.getElementById('errorCloseBtn');
        this.weatherContainer = document.getElementById('weatherContainer');
        this.initialState = document.getElementById('initialState');
        this.getStartedBtn = document.getElementById('getStartedBtn');

        // Weather display elements
        this.cityName = document.getElementById('cityName');
        this.weatherDesc = document.getElementById('weatherDesc');
        this.lastUpdated = document.getElementById('lastUpdated');
        this.tempIcon = document.getElementById('tempIcon');
        this.mainTemp = document.getElementById('mainTemp');
        this.humidity = document.getElementById('humidity');
        this.windSpeed = document.getElementById('windSpeed');
        this.windDirection = document.getElementById('windDirection');
        this.feelsLike = document.getElementById('feelsLike');
        this.maxTemp = document.getElementById('maxTemp');
        this.minTemp = document.getElementById('minTemp');
        this.pressure = document.getElementById('pressure');
        this.visibility = document.getElementById('visibility');

        // Forecast and saved cities
        this.forecastContainer = document.getElementById('forecastContainer');
        this.savedCitiesContainer = document.getElementById('savedCitiesContainer');
        this.clearSavedBtn = document.getElementById('clearSavedBtn');
        this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');
        this.importFile = document.getElementById('importFile');

        // Stats
        this.totalTasks = document.getElementById('totalTasks');
        this.activeTasks = document.getElementById('activeTasks');
        this.completedTasks = document.getElementById('completedTasks');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search events
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        this.cityInput.addEventListener('input', (e) => this.handleSearchInput(e));
        this.locationBtn.addEventListener('click', () => this.handleLocationClick());

        // Suggestion selection
        this.suggestionsDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                this.handleSuggestionClick(e.target);
            }
        });

        // UI events
        this.errorCloseBtn.addEventListener('click', () => this.hideError());
        this.clearSavedBtn.addEventListener('click', () => this.handleClearSavedCities());
        this.getStartedBtn.addEventListener('click', () => this.handleLocationClick());
        this.exportBtn.addEventListener('click', () => this.handleExport());
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImport(e));
    }

    /**
     * Check if API key is set
     */
    checkAPIKey() {
        if (weatherAPI.apiKey === 'YOUR_API_KEY_HERE') {
            this.showError('⚠️ API Key not configured. Please set your OpenWeatherMap API key in js/weather-api.js');
        }
    }

    /**
     * Handle search input with suggestions
     */
    handleSearchInput(e) {
        clearTimeout(this.searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            this.suggestionsDiv.innerHTML = '';
            this.suggestionsDiv.classList.remove('active');
            return;
        }

        this.searchTimeout = setTimeout(async () => {
            try {
                const suggestions = await weatherAPI.searchCities(query);
                this.displaySuggestions(suggestions);
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    }

    /**
     * Display search suggestions
     */
    displaySuggestions(suggestions) {
        if (suggestions.length === 0) {
            this.suggestionsDiv.innerHTML = '<div class="suggestion-item">No cities found</div>';
            this.suggestionsDiv.classList.add('active');
            return;
        }

        this.suggestionsDiv.innerHTML = suggestions.map(suggestion => 
            `<div class="suggestion-item" data-city="${suggestion.name}" data-lat="${suggestion.lat}" data-lon="${suggestion.lon}">
                📍 ${suggestion.display}
            </div>`
        ).join('');
        this.suggestionsDiv.classList.add('active');
    }

    /**
     * Handle suggestion selection
     */
    handleSuggestionClick(element) {
        const cityName = element.dataset.city;
        this.cityInput.value = cityName;
        this.suggestionsDiv.classList.remove('active');
        this.handleSearch();
    }

    /**
     * Handle search
     */
    async handleSearch() {
        const cityName = this.cityInput.value.trim();
        if (!cityName) return;

        this.showLoading();
        try {
            const data = await weatherAPI.getWeatherByCity(cityName);
            this.displayWeather(data);
            storageManager.saveCurrentWeather(data);
            storageManager.saveLastSearch(cityName);
            this.cityInput.value = '';
            this.suggestionsDiv.classList.remove('active');
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle location button click
     */
    async handleLocationClick() {
        this.showLoading();
        try {
            const location = await weatherAPI.getUserLocation();
            const data = await weatherAPI.getWeatherByCoordinates(location.lat, location.lon);
            this.displayWeather(data);
            storageManager.saveCurrentWeather(data);
            storageManager.saveCity({
                name: data.city,
                lat: location.lat,
                lon: location.lon
            });
            this.loadSavedCities();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Display weather data
     */
    displayWeather(data) {
        this.currentWeatherData = data.current;
        this.currentForecastData = data.forecast;

        // Update current weather
        this.cityName.textContent = data.city;
        this.weatherDesc.textContent = this.currentWeatherData.description;
        this.lastUpdated.textContent = `Last updated: ${this.formatTime(this.currentWeatherData.timestamp)}`;
        this.tempIcon.textContent = weatherAPI.getWeatherEmoji(this.currentWeatherData.icon);
        this.mainTemp.textContent = this.currentWeatherData.temp;

        // Update details
        this.humidity.textContent = `${this.currentWeatherData.humidity}%`;
        this.windSpeed.textContent = `${this.currentWeatherData.windSpeed} km/h`;
        this.windDirection.textContent = `${this.currentWeatherData.windDirection} (${this.currentWeatherData.windDegree}°)`;
        this.feelsLike.textContent = `${this.currentWeatherData.feelsLike}°C`;
        this.maxTemp.textContent = `${this.currentWeatherData.maxTemp}°C`;
        this.minTemp.textContent = `${this.currentWeatherData.minTemp}°C`;
        this.pressure.textContent = `${this.currentWeatherData.pressure} hPa`;
        this.visibility.textContent = `${this.currentWeatherData.visibility} km`;

        // Display forecast
        this.displayForecast();

        // Save city
        storageManager.saveCity({
            name: data.city,
            country: ''
        });

        this.loadSavedCities();
        this.showWeatherContainer();
    }

    /**
     * Display 5-day forecast
     */
    displayForecast() {
        this.forecastContainer.innerHTML = this.currentForecastData
            .slice(0, 5)
            .map(day => `
                <div class="forecast-card">
                    <div class="forecast-date">${this.formatDate(day.date)}</div>
                    <div class="forecast-icon">${weatherAPI.getWeatherEmoji(day.icon)}</div>
                    <div class="forecast-temp">${day.temp}°C</div>
                    <div class="forecast-desc">${day.description}</div>
                    <div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.8;">
                        ${day.maxTemp}° / ${day.minTemp}°
                    </div>
                </div>
            `)
            .join('');
    }

    /**
     * Load and display saved cities
     */
    loadSavedCities() {
        const cities = storageManager.getSavedCities();
        
        if (cities.length === 0) {
            this.savedCitiesContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #95a5a6;">No saved cities yet</p>';
            return;
        }

        this.savedCitiesContainer.innerHTML = cities.map(city => `
            <div class="saved-city-card" data-city="${city.name}">
                <div class="saved-city-name">${city.name}</div>
                <div class="saved-city-temp">${city.country || 'Loading...'}</div>
                <button class="remove-city" data-city="${city.name}" title="Remove">✕</button>
            </div>
        `).join('');

        // Add event listeners to saved city cards
        this.savedCitiesContainer.querySelectorAll('.saved-city-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('remove-city')) {
                    const cityName = card.dataset.city;
                    this.loadSavedCity(cityName);
                }
            });
        });

        // Add event listeners to remove buttons
        this.savedCitiesContainer.querySelectorAll('.remove-city').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cityName = btn.dataset.city;
                storageManager.removeCity(cityName);
                this.loadSavedCities();
            });
        });
    }

    /**
     * Load a saved city's weather
     */
    async loadSavedCity(cityName) {
        this.showLoading();
        try {
            const data = await weatherAPI.getWeatherByCity(cityName);
            this.displayWeather(data);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle clear saved cities
     */
    handleClearSavedCities() {
        if (confirm('Are you sure you want to clear all saved cities?')) {
            storageManager.clearAllCities();
            this.loadSavedCities();
        }
    }

    /**
     * Handle export
     */
    handleExport() {
        const data = storageManager.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weather-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Handle import
     */
    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const success = storageManager.importData(event.target.result);
                if (success) {
                    this.showError('✓ Data imported successfully!');
                    this.loadSavedCities();
                } else {
                    this.showError('✗ Failed to import data');
                }
            } catch (error) {
                this.showError('✗ Invalid file format');
            }
        };
        reader.readAsText(file);
        this.importFile.value = '';
    }

    /**
     * Show weather container
     */
    showWeatherContainer() {
        this.initialState.style.display = 'none';
        this.weatherContainer.style.display = 'block';
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.loading.style.display = 'block';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.loading.style.display = 'none';
    }

    /**
     * Show error
     */
    showError(message) {
        this.errorMsg.textContent = message;
        this.error.style.display = 'flex';
    }

    /**
     * Hide error
     */
    hideError() {
        this.error.style.display = 'none';
    }

    /**
     * Format date
     */
    formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Format time
     */
    formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WeatherDashboardApp();
});
