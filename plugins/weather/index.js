/**
 * Weather Plugin
 * Real-time forecasts and current conditions using Open-Meteo (100% free, 0 API keys).
 */
export default {
  name: 'weather',
  version: '1.0.0',
  description: 'Fetches real-time weather and forecast data from Open-Meteo.',
  requiredPermission: 'network.research',

  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather conditions and temperature for a city or coordinates.',
      parameters: {
        city: { type: 'string', description: 'City name (e.g. London, New York, Tokyo)' },
        latitude: { type: 'number', description: 'Optional latitude' },
        longitude: { type: 'number', description: 'Optional longitude' }
      },
      execute: async ({ city = 'London', latitude, longitude }) => {
        try {
          let lat = latitude;
          let lon = longitude;
          let resolvedCity = city;

          // If city given without lat/lon, geocode via Open-Meteo Geocoding API
          if (lat === undefined || lon === undefined) {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
            const geoRes = await fetch(geoUrl);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.results && geoData.results.length > 0) {
                lat = geoData.results[0].latitude;
                lon = geoData.results[0].longitude;
                resolvedCity = `${geoData.results[0].name}, ${geoData.results[0].country || ''}`;
              }
            }
          }

          if (lat === undefined || lon === undefined) {
            // Default coordinates for London if geocode fails
            lat = 51.5074;
            lon = -0.1278;
          }

          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&wind_speed_unit=kmh`;
          const res = await fetch(weatherUrl);
          if (!res.ok) {
            return { error: `Weather service error: ${res.statusText}` };
          }

          const data = await res.json();
          const current = data.current || {};

          // Weather code descriptions according to WMO
          const weatherMap = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            51: 'Light drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            95: 'Thunderstorm'
          };

          const condition = weatherMap[current.weather_code] || 'Clear';

          return {
            city: resolvedCity,
            coordinates: { latitude: lat, longitude: lon },
            temperature: `${current.temperature_2m}°C`,
            feelsLike: `${current.apparent_temperature}°C`,
            humidity: `${current.relative_humidity_2m}%`,
            condition,
            windSpeed: `${current.wind_speed_10m} km/h`,
            timestamp: current.time
          };
        } catch (err) {
          return { error: `Failed to fetch weather: ${err.message}` };
        }
      }
    }
  ]
};
