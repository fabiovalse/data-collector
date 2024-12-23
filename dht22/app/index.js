function updateTemperatureColor(temp) {
  // HSL color scale from blue (240) to red (0)
  const hue = Math.max(0, Math.min(240 - (temp + 10) * 6, 240));
  document.body.style.backgroundColor = `hsl(${hue}, 75%, 50%)`;
}

function getIntDecimal(number) {
  const int = Math.floor(number)
  return [int, (number - int).toFixed(1) * 10];
}

function getData(newHours) {
  const date = new Date();

  const year = date.getFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hours = (newHours || date.getUTCHours()).toString().padStart(2, '0')

  const fileName =`${year}/${month}/dht22_${year}-${month}-${day}_${hours}.json`;
  const url = `https://raw.githubusercontent.com/fabiovalse/data-collector/refs/heads/main/dht22/${fileName}`;

  fetch(url)
    .then(response => response.json())
    .then(response => {
      const { temperature, humidity} = JSON.parse(response);

      const [int, decimal] = getIntDecimal(temperature);

      document.getElementById('temperature').innerHTML = int;
      document.getElementById('temperature-decimal').innerHTML = decimal;
      
      document.getElementById('humidity').innerHTML = humidity.toFixed(1);

      updateTemperatureColor(temperature);
    })
    .catch(() => {
      getData(hours - 1);
    });
}

(function start() {
  getData();
})();
