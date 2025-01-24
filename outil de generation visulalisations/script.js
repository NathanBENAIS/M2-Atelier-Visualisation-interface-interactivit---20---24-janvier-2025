// Variables globales
let currentData = [];
let originalData = [];
let columns = [];
let chart = null;
let currentPage = 1;
let rowsPerPage = 5;
let width = 800;
let height = 600;

// Configuration des événements de glisser-déposer
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Effets visuels pendant le drag
dropZone.addEventListener('dragenter', () => {
    dropZone.querySelector('div').classList.remove('border-gray-300');
    dropZone.querySelector('div').classList.add('border-indigo-500');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.querySelector('div').classList.remove('border-indigo-500');
    dropZone.querySelector('div').classList.add('border-gray-300');
});

dropZone.addEventListener('drop', (e) => {
    dropZone.querySelector('div').classList.remove('border-indigo-500');
    dropZone.querySelector('div').classList.add('border-gray-300');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        fileInput.files = e.dataTransfer.files;
        handleFile(file);
    }
});

// Événements de base
document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        updateDataTable();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(currentData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updateDataTable();
    }
});

document.getElementById('rowsPerPage').addEventListener('change', (e) => {
    rowsPerPage = parseInt(e.target.value);
    currentPage = 1;
    updateDataTable();
});

// Fonctions de gestion des fichiers
function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
}

function handleFile(file) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.classList.add('hidden');

    if (!file) return;

    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
        reader.onload = (e) => processCSV(e.target.result);
        reader.readAsText(file);
    } else if (file.name.match(/\.xlsx?$/)) {
        reader.onload = (e) => processExcel(e.target.result);
        reader.readAsArrayBuffer(file);
    } else {
        showError('Format de fichier non supporté. Utilisez CSV ou Excel.');
    }
}

function processCSV(content) {
    Papa.parse(content, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: handleParsedData,
        error: (error) => showError('Erreur lors de la lecture du fichier CSV: ' + error.message)
    });
}

function processExcel(arrayBuffer) {
    try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length > 0) {
            handleParsedData({ data: jsonData });
        }
    } catch (error) {
        showError('Erreur lors de la lecture du fichier Excel: ' + error.message);
    }
}

// Fonctions de mise à jour de l'interface
function handleParsedData(results) {
    if (!results.data || !results.data.length) {
        showError('Aucune donnée valide trouvée dans le fichier');
        return;
    }

    originalData = results.data;
    currentData = [...originalData];
    columns = Object.keys(results.data[0]);
    currentPage = 1;
    
    document.getElementById('controls').classList.remove('hidden');
    document.getElementById('filterControls').classList.remove('hidden');
    updateColumnSelectors();
    addFilterControls();
    updateDataTable();
    addSortingFunctionality();
    updateChart();
}

function addFilterControls() {
    const filterColumn = document.getElementById('filterColumn');
    filterColumn.innerHTML = '<option value="">Sélectionnez une colonne</option>' +
        columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    document.getElementById('applyFilter').addEventListener('click', applyFilters);
}

function addSortingFunctionality() {
    const headers = document.querySelectorAll('#dataTable thead th');
    headers.forEach((header, index) => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => sortTable(index));
        
        // Ajout d'un indicateur de tri
        const originalText = header.textContent;
        header.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${originalText}</span>
                <span class="sort-indicator ml-2">↕</span>
            </div>
        `;
    });
}

let sortState = {}; // Pour stocker l'état de tri de chaque colonne
function sortTable(columnIndex) {
    const column = columns[columnIndex];
    
    // Mettre à jour l'état de tri
    if (!sortState[column]) {
        sortState[column] = 'asc';
    } else {
        sortState[column] = sortState[column] === 'asc' ? 'desc' : 'asc';
    }
    
    // Trier les données
    currentData.sort((a, b) => {
        let comparison = 0;
        if (a[column] < b[column]) comparison = -1;
        if (a[column] > b[column]) comparison = 1;
        return sortState[column] === 'asc' ? comparison : -comparison;
    });
    
    // Mettre à jour l'interface
    updateDataTable();
    
    // Mettre à jour les indicateurs de tri
    const headers = document.querySelectorAll('#dataTable thead th');
    headers.forEach((header, index) => {
        const indicator = header.querySelector('.sort-indicator');
        if (index === columnIndex) {
            indicator.textContent = sortState[column] === 'asc' ? '↑' : '↓';
        } else {
            indicator.textContent = '↕';
        }
    });
}

function applyFilters() {
    const column = document.getElementById('filterColumn').value;
    const operator = document.getElementById('filterOperator').value;
    const filterValue = document.getElementById('filterValue').value;
    
    if (!column || !filterValue) {
        currentData = [...originalData];
    } else {
        currentData = originalData.filter(row => {
            const value = row[column];
            switch(operator) {
                case 'equals':
                    return String(value).toLowerCase() === filterValue.toLowerCase();
                case 'contains':
                    return String(value).toLowerCase().includes(filterValue.toLowerCase());
                case 'greater':
                    return Number(value) > Number(filterValue);
                case 'less':
                    return Number(value) < Number(filterValue);
                default:
                    return true;
            }
        });
    }
    
    currentPage = 1;
    updateDataTable();
    updateChart();
}

function updateColumnSelectors() {
    const xSelect = document.getElementById('xAxis');
    const ySelect = document.getElementById('yAxis');
    
    xSelect.innerHTML = '<option value="">Sélectionnez une colonne</option>' +
        columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    ySelect.innerHTML = '<option value="">Sélectionnez une colonne</option>' +
        columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    [xSelect, ySelect, document.getElementById('chartType')].forEach(select => {
        select.addEventListener('change', updateChart);
    });
}

function updateDataTable() {
    const table = document.getElementById('dataTable');
    const totalPages = Math.ceil(currentData.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    
    // En-têtes avec indicateurs de tri
    table.querySelector('thead').innerHTML = `
        <tr>
            ${columns.map(col => `
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                    <div class="flex items-center justify-between">
                        <span>${col}</span>
                        <span class="sort-indicator ml-2">↕</span>
                    </div>
                </th>
            `).join('')}
        </tr>
    `;
    
    table.querySelector('tbody').innerHTML = currentData.slice(start, end).map(row => `
        <tr class="hover:bg-gray-50">
            ${columns.map(col => `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row[col]}</td>
            `).join('')}
        </tr>
    `).join('');

    document.getElementById('pageInfo').textContent = `Page ${currentPage} sur ${totalPages}`;
    
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
    
    [prevButton, nextButton].forEach(button => {
        if (button.disabled) {
            button.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            button.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
}

function updateChart() {
    const chartType = document.getElementById('chartType').value;
    const xColumn = document.getElementById('xAxis').value;
    const yColumn = document.getElementById('yAxis').value;
    
    if (!xColumn || !yColumn) return;

    // Détruire le graphique précédent s'il existe
    if (chart) {
        chart.destroy();
        chart = null;
    }

    // Obtenir le canvas et nettoyer le contexte
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
        switch(chartType) {
            case 'boxplot':
                createBoxPlot(xColumn, yColumn);
                break;
            case 'scatter':
                createScatterPlot(xColumn, yColumn);
                break;
            case 'heatmap':
                createHeatmap();
                break;
            case 'mixed':
                createMixedChart(xColumn, yColumn);
                break;
            case 'radar':
                createRadarChart(xColumn, yColumn);
                break;
            default:
                createRegularChart(chartType, xColumn, yColumn);
                break;
        }
    } catch (error) {
        console.error('Erreur lors de la création du graphique:', error);
        showError('Erreur lors de la création du graphique. Vérifiez que le type de données est compatible.');
    }
}

function createBoxPlot(xColumn, yColumn) {
    const groupedData = _.groupBy(currentData, row => row[xColumn]);
    
    const boxplotData = {
        labels: Object.keys(groupedData),
        datasets: [{
            label: yColumn,
            data: Object.values(groupedData).map(group => {
                const values = group.map(item => Number(item[yColumn])).filter(v => !isNaN(v));
                return values;
            }),
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            outlierColor: '#666',
            padding: 10
        }]
    };

    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'boxplot',
        data: boxplotData,
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Distribution de ${yColumn} par ${xColumn}`
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function createScatterPlot(xColumn, yColumn) {
    const data = currentData.map(row => ({
        x: row[xColumn],
        y: row[yColumn]
    }));

    if (chart) chart.destroy();
    
    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: `${xColumn} vs ${yColumn}`,
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: 'rgb(99, 102, 241)',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xColumn
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yColumn
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `${xColumn}: ${context.parsed.x}, ${yColumn}: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

function calculateCorrelation(x, y) {
    const n = x.length;
    const mean_x = x.reduce((a, b) => a + b) / n;
    const mean_y = y.reduce((a, b) => a + b) / n;
    
    const covariance = x.map((xi, i) => (xi - mean_x) * (y[i] - mean_y))
        .reduce((a, b) => a + b) / n;
    
    const std_x = Math.sqrt(x.map(xi => Math.pow(xi - mean_x, 2))
        .reduce((a, b) => a + b) / n);
    const std_y = Math.sqrt(y.map(yi => Math.pow(yi - mean_y, 2))
        .reduce((a, b) => a + b) / n);
    
    return covariance / (std_x * std_y);
}

function createHeatmap() {
    // Filtrer uniquement les colonnes numériques
    const numericColumns = columns.filter(col => 
        typeof currentData[0][col] === 'number'
    );

    const correlationData = [];
    for (let i = 0; i < numericColumns.length; i++) {
        for (let j = 0; j < numericColumns.length; j++) {
            const col1 = numericColumns[i];
            const col2 = numericColumns[j];
            const correlation = calculateCorrelation(
                currentData.map(row => row[col1]),
                currentData.map(row => row[col2])
            );
            correlationData.push({
                x: col1,
                y: col2,
                correlation: correlation
            });
        }
    }

    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                data: correlationData,
                backgroundColor: (context) => {
                    const value = context.raw.correlation;
                    return `hsla(${((1 + value) * 120).toString(10)},70%,50%,0.8)`;
                },
                pointRadius: 20,
                pointHoverRadius: 25
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `Corrélation: ${context.raw.correlation.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    labels: numericColumns
                },
                y: {
                    type: 'category',
                    labels: numericColumns
                }
            }
        }
    });
}

function createMixedChart(xColumn, yColumn) {
    if (chart) chart.destroy();

    const data = currentData.map(row => ({
        x: row[xColumn],
        y: row[yColumn]
    }));

    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        data: {
            labels: data.map(d => d.x),
            datasets: [
                {
                    type: 'bar',
                    label: `${yColumn} (Barres)`,
                    data: data.map(d => d.y),
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    order: 2
                },
                {
                    type: 'line',
                    label: `${yColumn} (Ligne)`,
                    data: data.map(d => d.y),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Graphique combiné barres et ligne'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xColumn
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yColumn
                    }
                }
            }
        }
    });
}

function createRadarChart(xColumn, yColumn) {
    if (chart) chart.destroy();

    const data = currentData.map(row => ({
        label: row[xColumn],
        value: row[yColumn]
    }));

    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: yColumn,
                data: data.map(d => d.value),
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: 'rgb(99, 102, 241)',
                pointBackgroundColor: 'rgb(99, 102, 241)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(99, 102, 241)'
            }]
        },
        options: {
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Distribution de ${yColumn} par ${xColumn}`
                }
            }
        }
    });
}

function createRegularChart(chartType, xColumn, yColumn) {
    const chartData = currentData.map(row => ({
        x: row[xColumn],
        y: row[yColumn]
    })).filter(item => item.x != null && item.y != null);
    
    const ctx = document.getElementById('chart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    const colors = {
        primary: 'rgba(99, 102, 241, 0.2)',
        border: 'rgba(99, 102, 241, 1)',
        point: 'rgba(99, 102, 241, 1)'
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        family: '-apple-system, system-ui, sans-serif',
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: {
                    family: '-apple-system, system-ui, sans-serif',
                    size: 14
                },
                bodyFont: {
                    family: '-apple-system, system-ui, sans-serif',
                    size: 13
                },
                padding: 12,
                cornerRadius: 4
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        family: '-apple-system, system-ui, sans-serif'
                    }
                }
            },
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        family: '-apple-system, system-ui, sans-serif'
                    }
                }
            }
        }
    };

    if (chartType === 'pie') {
        options.scales = {};
    }
    
    chart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: chartData.map(d => d.x),
            datasets: [{
                label: yColumn,
                data: chartData.map(d => d.y),
                backgroundColor: chartType === 'pie' ? 
                    chartData.map((_, index) => {
                        const hue = (index * 137.508) % 360;
                        return `hsla(${hue}, 70%, 60%, 0.8)`;
                    }) : 
                    colors.primary,
                borderColor: chartType === 'pie' ? 'white' : colors.border,
                borderWidth: chartType === 'pie' ? 2 : 1,
                pointBackgroundColor: colors.point,
                pointRadius: chartType === 'line' ? 4 : 0,
                pointHoverRadius: chartType === 'line' ? 6 : 0
            }]
        },
        options: options
    });
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}
