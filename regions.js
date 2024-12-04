// mapboxgl.accessToken = 'pk.eyJ1Ijoic3lubmdhdGVjaCIsImEiOiJjbTF4dGF1cTkwdnZ1MmtxMWRwNDgwazVpIn0.aoTqmmjvf-wJDx-0zbBq5A';

const regionsMap = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/synngatech/cm46fr29d00rk01qr2l52fofh',
    center: [127.05593, 40.34743],
    zoom: 6.33,
    maxZoom: 20, // 최대 줌 레벨 설정
    minZoom: 6  // 최소 줌 레벨 설정
});

// Global Variables
let allFeaturesData2 = [];
let sortedLabels2 = [];
let sortedData2 = [];
let selectedFeatures2 = [];

// Remove "_count" to make legible labels
function filterCountProperties(properties) {
    return Object.entries(properties)
        .filter(([key, value]) => key.endsWith('_count') && value !== null)
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
}

function preparesortedData(selectedData) {
    if (!selectedData || selectedData.length === 0) {
        sortedLabels2 = [];
        sortedData2 = [];
        return;
    }

    const aggregated = selectedData.reduce((acc, feature) => {
        const counts = filterCountProperties(feature.properties);
        for (const [key, value] of Object.entries(counts)) {
            acc[key] = (acc[key] || 0) + value;
        }
        return acc;
    }, {});

    const sortedEntries = Object.entries(aggregated)
        .map(([key, value]) => ({ label: key.replace('_count', ''), value }))
        .sort((a, b) => a.label.localeCompare(b.label));

    sortedLabels2 = sortedEntries.map(entry => entry.label);
    sortedData2 = sortedEntries.map(entry => entry.value);
}

function updateChart(chart) {
    chart.data.labels = sortedLabels2;
    chart.data.datasets[0].data = sortedData2;
    chart.update();
}

function updateStatistics(selectedData) {
    const statisticsContainer = document.getElementById('statistics');
    const chart2Title = document.getElementById('chart2Title');
    const chart2Description = document.getElementById('chart2Description');

    if (!selectedData || selectedData.length === 0) {
        chart2Title.innerHTML = 'No Location Selected';
        chart2Description.innerHTML = '<p>Select a point on the map to see details.</p>';
        statisticsContainer.innerHTML = '<p>No data available for statistics.</p>';
        return;
    }

    const locations = selectedData.map(feature => feature.properties['Location Where the Violation Occurred']);
    const locationString = locations.join(', ');

    chart2Title.innerHTML = locations.length > 1 ? `Details for Multiple Locations` : `Details for ${locations[0]}`;
    chart2Description.innerHTML = `
        <p>This chart shows the combined violation counts for the selected locations: <strong>${locationString}</strong>.</p>
    `;

    const aggregated = selectedData.reduce((acc, feature) => {
        const counts = filterCountProperties(feature.properties);
        for (const [key, value] of Object.entries(counts)) {
            acc[key] = (acc[key] || 0) + value;
        }
        return acc;
    }, {});

    let statisticsHTML = '<h4>Statistics</h4><ul>';
    for (const [key, value] of Object.entries(aggregated)) {
        const label = key.replace('_count', '');
        statisticsHTML += `<li>${label}: ${value}</li>`;
    }
    statisticsHTML += '</ul>';
    statisticsContainer.innerHTML = statisticsHTML;
}

// Chart.js 설정
function createChartConfig() {
    return {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Violation Counts',
                    data: [],
                    backgroundColor: 'rgba(255, 105, 180, 0.5)',
                    borderColor: 'rgba(255, 105, 180, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false, position: 'top' }
            },
            scales: {
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        font: { size: 10 },
                        callback: function (value, index, values) {
                            const label = this.getLabelForValue(value);
                            if (!label) return '';

                            const chartWidth = this.chart.width; // 차트의 전체 폭
                            const barCount = this.chart.data.labels.length; // Bar 개수
                            const barWidth = chartWidth / barCount; // 각 Bar의 폭
                            const charWidth = 6; // 문자 한 개의 대략적인 폭 (픽셀 기준)
                            const maxCharsPerLine = Math.floor(barWidth / charWidth); // 각 Bar 폭에 맞는 최대 문자 수

                            // 단어 단위로 줄바꿈
                            const words = label.split(' ');
                            let lines = [];
                            let currentLine = '';

                            for (const word of words) {
                                if ((currentLine + word).length <= maxCharsPerLine) {
                                    currentLine += (currentLine ? ' ' : '') + word;
                                } else {
                                    lines.push(currentLine);
                                    currentLine = word;
                                }
                            }
                            if (currentLine) lines.push(currentLine); // 마지막 줄 추가

                            return lines; // 줄바꿈된 라벨 반환
                        }
                    },
                    grid: {
                        offset: true
                    }
                },
                y: { beginAtZero: true }
            }
        }
    };
}

const ctx3 = document.getElementById('chart1').getContext('2d');
const chart3 = new Chart(ctx3, createChartConfig());
const ctx4 = document.getElementById('chart2').getContext('2d');
const chart4 = new Chart(ctx4, createChartConfig());

// 지도 초기화 및 데이터 로드
regionsMap.on('load', () => {
    regionsMap.addSource('north-korea-tileset', {
        type: 'vector',
        url: 'mapbox://synngatech.9srkza8x'
    });

    regionsMap.addLayer({
        id: 'north-korea-layer',
        type: 'circle',
        source: 'north-korea-tileset',
        'source-layer': 'rev_filtered_north_korea_data-2c9c11',
        paint: {
            'circle-radius': 6,
            'circle-color': '#1700c4',
            'circle-stroke-width': 2, // 윤곽선 두께
            'circle-stroke-color': '#FFFFFF' // 흰색 윤곽선
            //'circle-blur': 0.2 // Halo 효과 추가
        }
    });

    regionsMap.addLayer({
        id: 'north-korea-hit-area',
        type: 'circle',
        source: 'north-korea-tileset',
        'source-layer': 'rev_filtered_north_korea_data-2c9c11',
        paint: { 'circle-radius': 6.2, 'circle-color': 'rgba(0, 0, 0, 0)' }
    });

    fetch('https://Synn-Arch.github.io/NorthKoreanPrisons/Data/rev_filtered_north_korea_data.geojson')
    .then(response => response.json())
    .then(data => {
        // 각 Feature에 고유 ID 재생성
        data.features.forEach((feature, index) => {
            feature.id = `feature-${index}`; // 기존 ID를 덮어쓰고 고유 ID 재생성
        });
        allFeaturesData2 = data.features;
        prepareSortedData(allFeaturesData2);
        updateChart(chart1);
    });

    let popup = null; 

    regionsMap.on('mouseenter', 'north-korea-layer', (e) => {
        regionsMap.getCanvas().style.cursor = 'pointer';

        const feature = e.features[0];
        if (feature) {
            const properties = feature.properties;
            const location = properties['Location Where the Violation Occurred'];

            const counts = Object.entries(properties)
                .filter(([key, value]) => key.endsWith('_count') && value !== null)
                .map(([key, value]) => `<strong>${key.replace('_count', '')}:</strong> ${value}`)
                .join('<br>');

            const tooltipHTML = `
                <div>
                    <h4>${location}</h4>
                    ${counts}
                </div>
            `;

            // Remove any existing popup to avoid duplication
            if (popup) popup.remove();

            // Create a new popup
            popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 10
            })
                .setLngLat(feature.geometry.coordinates)
                .setHTML(tooltipHTML)
                .addTo(regionsMap);
        }
    });

    regionsMap.on('mouseleave', 'north-korea-layer', () => {
        if (popup) {
            popup.remove();
            popup = null; // Clear popup reference
        }
        regionsMap.getCanvas().style.cursor = ''; // Restore cursor
    });

    regionsMap.on('dragstart', () => {
        regionsMap.getCanvas().style.cursor = 'grab'; // 지도 이동 시
    });

    regionsMap.on('dragend', () => {
        regionsMap.getCanvas().style.cursor = ''; // 기본 커서로 복원
    });

    regionsMap.on('click', 'north-korea-hit-area', (e) => {
        const clickedFeatures = e.features || [];
    
        // "Location Where the Violation Occurred"를 ID로 사용
        clickedFeatures.forEach(feature => {
            feature.id = feature.properties["Location Where the Violation Occurred"] || `temporary-id-${feature.geometry.coordinates}`;
        });
    
        // Ctrl/Meta 키로 다중 선택 지원
        if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
            clickedFeatures.forEach(feature => {
                if (!selectedFeatures2.some(f => f.id === feature.id)) {
                    selectedFeatures2.push(feature);
                }
            });
        } else {
            selectedFeatures2 = clickedFeatures; // 단일 선택 모드
        }
    
        updateSelectedFeaturesStyle();
        prepareSortedData(selectedFeatures2);
        updateChart(chart2);
        updateStatistics(selectedFeatures2);
    
        // 선택된 고유 ID 출력
        console.log("Selected IDs:", selectedFeatures2.map(f => f.id));
    });

    function updateSelectedFeaturesStyle() {
        const selectedFeatureIds = selectedFeatures2.map(f => f.id);
    
        regionsMap.setPaintProperty('north-korea-layer', 'circle-color', [
            'case',
            ['in', ['get', 'Location Where the Violation Occurred'], ['literal', selectedFeatureIds]], '#FF0000', // 선택된 포인트는 빨간색
            '#1700c4' // 기본 색상
        ]);
    }

    regionsMap.on('click', (e) => {
        const clickedFeatures = regionsMap.queryRenderedFeatures(e.point, {
            layers: ['north-korea-layer']
        });
    
        if (clickedFeatures.length === 0) {
            resetSelection();
        }
    });

    ctx3.canvas.onclick = (event) => {
        const points = chart1.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);

        if (points.length > 0) {
            const clickedIndex = points[0].index;
            const selectedLabel = chart1.data.labels[clickedIndex];
            const selectedValue = chart1.data.datasets[0].data[clickedIndex];

            updateMapPointSizes(selectedLabel, selectedValue);
        } else {
            resetSelection();
        }
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            resetSelection();
            popup.remove();
        }
    });

    function updateMapPointSizes(selectedLabel, selectedValue) {
        const steps = 30;
        const startRadius = 6;
        const endRadiusScale = 100;

        function animateStep(step) {
            const t = step / steps;
            const currentRadiusScale = startRadius + t * (endRadiusScale - startRadius);

            regionsMap.setPaintProperty('north-korea-layer', 'circle-radius', [
                'case',
                ['==', ['get', `${selectedLabel}_count`], null], 6,
                ['*', ['/', ['get', `${selectedLabel}_count`], selectedValue], currentRadiusScale]
            ]);

            if (step < steps) {
                requestAnimationFrame(() => animateStep(step + 1));
            }
        }

        animateStep(0);
    }

    function resetSelection() {
        // 선택된 피처 초기화
        selectedFeatures2 = [];
        
        // 차트 데이터 초기화
        prepareSortedData([]);
        updateChart(chart2);
        
        // 통계 데이터 초기화
        updateStatistics([]);
        
        // 맵 스타일 초기화
        regionsMap.setPaintProperty('north-korea-layer', 'circle-color', '#1700c4'); // 기본 색상 복원
        regionsMap.setPaintProperty('north-korea-layer', 'circle-radius', 6); // 기본 크기 복원
        
        console.log('Selection cleared.');
    }
});

// 탭 전환 기능
document.querySelectorAll('.menu-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;

        document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        e.target.classList.add('active');
        document.getElementById(`${targetTab}Content`).classList.add('active');
    });
});

// 기본 탭 설정
document.querySelector('.menu-tab[data-tab="prisons"]').click();
