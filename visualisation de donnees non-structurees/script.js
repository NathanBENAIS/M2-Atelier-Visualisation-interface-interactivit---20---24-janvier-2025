const canvas = document.getElementById("rainCanvas");
const ctx = canvas.getContext("2d");
let rainData = [];
let selectedWord = null;
let offsetX, offsetY;
let currentView = "rain";
let currentDirection = "vertical";

const filterControls = `
  <div class="space-y-4">
    <label class="block text-sm font-medium mb-2 dark:text-gray-200 text-gray-700">Filtres de fréquence</label>
    <div class="flex space-x-4">
      <input type="number" id="minFreq" placeholder="Min" class="w-24 px-3 py-2 dark:bg-gray-700 bg-gray-100 rounded-lg dark:text-gray-200 text-gray-700" min="1" />
      <input type="number" id="maxFreq" placeholder="Max" class="w-24 px-3 py-2 dark:bg-gray-700 bg-gray-100 rounded-lg dark:text-gray-200 text-gray-700" min="1" />
      <button onclick="applyFrequencyFilter()" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white">
        Filtrer
      </button>
    </div>
  </div>
`;

document.querySelector('.space-y-6').insertAdjacentHTML('beforeend', filterControls);

function switchView(view) {
  currentView = view;
  document.getElementById("rainCanvas").style.display = view === "rain" ? "block" : "none";
  document.getElementById("wordCloud").style.display = view === "cloud" ? "block" : "none";
  document.getElementById("circlePacking").style.display = view === "circle" ? "block" : "none";
}

function changeDirection(direction) {
  currentDirection = direction;
  ["vertical", "horizontal", "diagonal"].forEach((dir) => {
    const btn = document.getElementById(`${dir}Btn`);
    if (dir === direction) {
      btn.classList.add("bg-blue-600");
      btn.classList.remove("bg-gray-700");
    } else {
      btn.classList.remove("bg-blue-600");
      btn.classList.add("bg-gray-700");
    }
  });

  rainData.forEach((data) => {
    if (direction === "vertical") {
      data.speedX = 0;
      data.speedY = Math.random() * 0.5 + 0.5;
    } else if (direction === "horizontal") {
      data.speedX = Math.random() * 0.5 + 0.5;
      data.speedY = 0;
    } else if (direction === "diagonal") {
      data.speedX = Math.random() * 0.5 + 0.5;
      data.speedY = Math.random() * 0.5 + 0.5;
    }
  });
}

function filterByFrequency(data, minFreq, maxFreq) {
  return data.filter(item => {
    const freq = typeof item.value !== 'undefined' ? item.value : 
                (typeof item.freq !== 'undefined' ? item.freq : 1);
    return (!minFreq || freq >= minFreq) && (!maxFreq || freq <= maxFreq);
  });
}

function applyFrequencyFilter() {
  const minFreq = parseInt(document.getElementById('minFreq').value) || null;
  const maxFreq = parseInt(document.getElementById('maxFreq').value) || null;
  
  if (currentView === 'rain') {
    startRainEffect();
  } else if (currentView === 'cloud') {
    generateWordCloud(minFreq, maxFreq);
  } else if (currentView === 'circle') {
    generateCirclePacking(minFreq, maxFreq);
  }
}

function getRandomColor() {
  const colors = [
    "#60A5FA", "#818CF8", "#A78BFA", "#C084FC",
    "#E879F9", "#F472B6", "#FB7185", "#FCA5A5"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getSentimentColor(word) {
  const positiveWords = ["good", "happy", "joy", "love", "great", "excellent", "wonderful", "amazing", "fantastic"];
  const negativeWords = ["bad", "sad", "hate", "angry", "terrible", "awful", "horrible", "poor", "worst"];
  const neutralWords = ["the", "and", "or", "but", "if", "then", "when", "what", "how"];

  if (positiveWords.includes(word.toLowerCase())) {
    return "#4ADE80";
  } else if (negativeWords.includes(word.toLowerCase())) {
    return "#FB7185";
  } else if (neutralWords.includes(word.toLowerCase())) {
    return "#94A3B8";
  } else {
    return getRandomColor();
  }
}

function resizeCanvas() {
  const container = document.getElementById("visualContainer");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

function startRainEffect() {
  const minFreq = parseInt(document.getElementById('minFreq').value) || null;
  const maxFreq = parseInt(document.getElementById('maxFreq').value) || null;
  
  switchView('rain');
  resizeCanvas();
  const text = document.getElementById('inputText').value;
  rainData = [];

  if (text.trim()) {
    const words = text.split(/\s+/);
    const wordFreq = {};
    words.forEach(word => {
      if (word) wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    let wordData = Object.entries(wordFreq).map(([word, freq]) => ({
      word,
      freq
    }));

    wordData = filterByFrequency(wordData, minFreq, maxFreq);
    
    const numColumns = 6;
    const columnWidth = canvas.width / numColumns;
    
    wordData.forEach((item, index) => {
      const size = Math.min(40, 20 + item.freq * 3);
      const column = index % numColumns;
      const x = column * columnWidth + (Math.random() * columnWidth * 0.3);
      
      rainData.push({
        word: item.word,
        x,
        y: Math.random() * -canvas.height * 2,
        speedX: currentDirection === 'horizontal' || currentDirection === 'diagonal' ? Math.random() * 1 + 1 : 0,
        speedY: currentDirection === 'vertical' || currentDirection === 'diagonal' ? Math.random() * 1 + 1 : 0,
        color: getSentimentColor(item.word),
        size,
        isMoving: false,
        freq: item.freq
      });
    });
    
    animateRain();
  }
}

function animateRain() {
  if (currentView !== 'rain') return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const circularWrapEnabled = document.getElementById('circularWrap').checked;

  rainData.forEach(data => {
    ctx.font = `${data.size}px Arial`;
    ctx.fillStyle = data.color;
    
    if (data.isMoving) {
      data.x = offsetX;
      data.y = offsetY;
    } else {
      data.x += data.speedX;
      data.y += data.speedY;
      
      if (circularWrapEnabled) {
        data.x = data.x > canvas.width ? 0 : (data.x < 0 ? canvas.width : data.x);
        data.y = data.y > canvas.height ? -50 : data.y;
      } else {
        if (data.y > canvas.height) {
          data.y = Math.random() * -100;
          data.x = Math.random() * (canvas.width - 100) + 50;
        }
        if (data.x > canvas.width) {
          data.x = 0;
        }
      }
    }
    
    ctx.fillText(data.word, data.x, data.y);
  });

  requestAnimationFrame(animateRain);
}

function generateWordCloud(minFreq = null, maxFreq = null) {
  switchView("cloud");
  const text = document.getElementById("inputText").value;
  const container = document.getElementById("visualContainer");
  const width = container.clientWidth;
  const height = container.clientHeight;

  const words = text.split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    if (word) wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  let wordData = Object.entries(wordFreq).map(([text, value]) => ({
    text,
    size: Math.min(30, 12 + value * 2),
    color: getSentimentColor(text),
    freq: value
  }));

  wordData = filterByFrequency(wordData, minFreq, maxFreq);

  d3.select("#wordCloud").selectAll("*").remove();

  const svg = d3.select("#wordCloud")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const layout = d3.layout.cloud()
    .size([width, height])
    .words(wordData)
    .padding(2)
    .rotate(() => (Math.random() > 0.5 ? 0 : 90))
    .font("Impact")
    .fontSize(d => d.size)
    .on("end", draw);

  layout.start();

  function draw(words) {
    svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`)
      .selectAll("text")
      .data(words)
      .enter()
      .append("text")
      .style("font-size", d => `${d.size}px`)
      .style("font-family", "Impact")
      .style("fill", d => d.color)
      .attr("text-anchor", "middle")
      .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
      .text(d => d.text)
      .on("click", function(event, d) {
        showWordInfo(d.text, d.freq);
      });
  }
}

function generateCirclePacking(minFreq = null, maxFreq = null) {
  switchView("circle");
  const text = document.getElementById("inputText").value;
  const container = document.getElementById("visualContainer");
  const width = container.clientWidth;
  const height = container.clientHeight;

  const words = text.split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    if (word) wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  let data = Object.entries(wordFreq).map(([name, value]) => ({
    name,
    value
  }));

  data = filterByFrequency(data, minFreq, maxFreq);

  const root = {
    name: "root",
    children: data
  };

  d3.select("#circlePacking").selectAll("*").remove();

  const svg = d3.select("#circlePacking")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const pack = d3.pack().size([width, height]).padding(3);
  const hierarchy = d3.hierarchy(root).sum((d) => d.value);
  const packedData = pack(hierarchy);
  const colorScale = d3.scaleSequential()
    .domain([0, packedData.children.length])
    .interpolator(d3.interpolateViridis);

  const g = svg.append("g");

  g.selectAll("circle")
    .data(packedData.descendants().slice(1))
    .enter()
    .append("circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => d.r)
    .attr("fill", (d, i) => colorScale(i))
    .attr("opacity", 0.7)
    .on("mouseover", function () {
      d3.select(this).attr("opacity", 1);
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 0.7);
    })
    .on("click", function (event, d) {
      showWordInfo(d.data.name, d.value);
    });

  g.selectAll("text")
    .data(packedData.descendants().slice(1))
    .enter()
    .append("text")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("font-size", (d) => Math.min(d.r / 2, 14))
    .text((d) => d.data.name)
    .attr("fill", "white")
    .style("pointer-events", "none");
}

const definitions = {
  "sanctuaire": "Lieu sacré, édifice consacré à la pratique d'un culte ou endroit protégé servant de refuge",
  "sanctuaires": "Lieu sacré, édifice consacré à la pratique d'un culte ou endroit protégé servant de refuge",
};

function showWordInfo(word, frequency) {
  let wordInfo = `Mot : ${word}<br> Occurrences : ${frequency}`;
  
  if (definitions[word.toLowerCase()]) {
    wordInfo += `<br><br>Définition : ${definitions[word.toLowerCase()]}`;
  }
  
  document.getElementById("wordInfo").innerHTML = wordInfo;
  document.getElementById("infoModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("infoModal").classList.add("hidden");
}

canvas.addEventListener("mousedown", function (event) {
  const mouseX = event.offsetX;
  const mouseY = event.offsetY;

  rainData.forEach((data) => {
    const wordWidth = ctx.measureText(data.word).width;
    if (
      mouseX >= data.x &&
      mouseX <= data.x + wordWidth &&
      mouseY >= data.y - data.size &&
      mouseY <= data.y
    ) {
      selectedWord = data;
      selectedWord.isMoving = true;
      offsetX = mouseX;
      offsetY = mouseY;
    }
  });
});

canvas.addEventListener("mousemove", function (event) {
  if (selectedWord && selectedWord.isMoving) {
    offsetX = event.offsetX;
    offsetY = event.offsetY;
  }
});

canvas.addEventListener("mouseup", function () {
  if (selectedWord) {
    selectedWord.isMoving = false;
    selectedWord = null;
  }
});

window.addEventListener('resize', resizeCanvas);

// Initial setup
switchView("rain");
resizeCanvas();