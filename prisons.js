// Mapbox Access Token 설정
mapboxgl.accessToken = 'pk.eyJ1Ijoic3lubmdhdGVjaCIsImEiOiJjbTF4dGF1cTkwdnZ1MmtxMWRwNDgwazVpIn0.aoTqmmjvf-wJDx-0zbBq5A';

// Mapbox 지도 초기화
const prisonsMap = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/synngatech/cm2tit89i00ix01qi8cq205c3',
    center: [127.05593, 40.34743],
    zoom: 6.33
});

// 전역 변수 선언
let allFeaturesData = [];
let sortedLabels = [];
let sortedData = [];
let selectedFeatures = [];

// 데이터 처리 함수
function filterCountProperties(properties) {
    return Object.entries(properties)
        .filter(([key, value]) => key.endsWith('_count') && value !== null)
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
}

function prepareSortedData(selectedData) {
    if (!selectedData || selectedData.length === 0) {
        sortedLabels = [];
        sortedData = [];
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

    sortedLabels = sortedEntries.map(entry => entry.label);
    sortedData = sortedEntries.map(entry => entry.value);
}

function updateChart(chart) {
    chart.data.labels = sortedLabels;
    chart.data.datasets[0].data = sortedData;
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
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
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

const ctx1 = document.getElementById('chart1').getContext('2d');
const chart1 = new Chart(ctx1, createChartConfig());
const ctx2 = document.getElementById('chart2').getContext('2d');
const chart2 = new Chart(ctx2, createChartConfig());

// 지도 초기화 및 데이터 로드
prisonsMap.on('load', () => {
    prisonsMap.addSource('north-korea-tileset', {
        type: 'vector',
        url: 'mapbox://synngatech.9srkza8x'
    });

    prisonsMap.addLayer({
        id: 'north-korea-layer',
        type: 'circle',
        source: 'north-korea-tileset',
        'source-layer': 'rev_filtered_north_korea_data-2c9c11',
        paint: { 'circle-radius': 6, 'circle-color': '#007cbf' }
    });

    prisonsMap.addLayer({
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
        allFeaturesData = data.features;
        prepareSortedData(allFeaturesData);
        updateChart(chart1);
    });

    prisonsMap.on('mouseenter', 'north-korea-layer', (e) => {
        // 지도 캔버스 커서 변경 (포인트 위에 있을 때)
        prisonsMap.getCanvas().style.cursor = 'pointer';

        // 첫 번째 피처 가져오기
        const feature = e.features[0];
        if (feature) {
            const properties = feature.properties;
            const location = properties['Location Where the Violation Occurred'];

            // `_count`로 끝나는 속성 필터링
            const counts = Object.entries(properties)
                .filter(([key, value]) => key.endsWith('_count') && value !== null)
                .map(([key, value]) => `<strong>${key.replace('_count', '')}:</strong> ${value}`)
                .join('<br>');

            // Tooltip 내용 생성
            const tooltipHTML = `
                <div>
                    <h4>${location}</h4>
                    ${counts}
                </div>
            `;

            // Popup 생성
            const popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 10
            })
                .setLngLat(feature.geometry.coordinates)
                .setHTML(tooltipHTML)
                .addTo(prisonsMap);

            // `mouseleave` 이벤트에서 팝업 제거
            prisonsMap.on('mouseleave', 'north-korea-layer', () => {
                popup.remove();
                prisonsMap.getCanvas().style.cursor = ''; // 커서 복원
            });
        }
    });

    prisonsMap.on('mouseleave', 'north-korea-layer', () => {
        prisonsMap.getCanvas().style.cursor = ''; // 기본 커서로 복원
    });

    prisonsMap.on('dragstart', () => {
        prisonsMap.getCanvas().style.cursor = 'grab'; // 지도 이동 시
    });

    prisonsMap.on('dragend', () => {
        prisonsMap.getCanvas().style.cursor = ''; // 기본 커서로 복원
    });

    prisonsMap.on('click', 'north-korea-hit-area', (e) => {
        const clickedFeatures = e.features || [];
    
        // "Location Where the Violation Occurred"를 ID로 사용
        clickedFeatures.forEach(feature => {
            feature.id = feature.properties["Location Where the Violation Occurred"] || `temporary-id-${feature.geometry.coordinates}`;
        });
    
        // Ctrl/Meta 키로 다중 선택 지원
        if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
            clickedFeatures.forEach(feature => {
                if (!selectedFeatures.some(f => f.id === feature.id)) {
                    selectedFeatures.push(feature);
                }
            });
        } else {
            selectedFeatures = clickedFeatures; // 단일 선택 모드
        }
    
        updateSelectedFeaturesStyle();
        prepareSortedData(selectedFeatures);
        updateChart(chart2);
        updateStatistics(selectedFeatures);
    
        // 선택된 고유 ID 출력
        console.log("Selected IDs:", selectedFeatures.map(f => f.id));
    });

    function updateSelectedFeaturesStyle() {
        const selectedFeatureIds = selectedFeatures.map(f => f.id);
    
        prisonsMap.setPaintProperty('north-korea-layer', 'circle-color', [
            'case',
            ['in', ['get', 'Location Where the Violation Occurred'], ['literal', selectedFeatureIds]], '#FF0000', // 선택된 포인트는 빨간색
            '#007cbf' // 기본 색상
        ]);
    }

    prisonsMap.on('click', (e) => {
        const clickedFeatures = prisonsMap.queryRenderedFeatures(e.point, {
            layers: ['north-korea-layer']
        });
    
        if (clickedFeatures.length === 0) {
            resetSelection();
        }
    });

    ctx1.canvas.onclick = (event) => {
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
        }
    });

    function updateMapPointSizes(selectedLabel, selectedValue) {
        const steps = 30;
        const startRadius = 6;
        const endRadiusScale = 100;

        function animateStep(step) {
            const t = step / steps;
            const currentRadiusScale = startRadius + t * (endRadiusScale - startRadius);

            prisonsMap.setPaintProperty('north-korea-layer', 'circle-radius', [
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
        selectedFeatures = [];
        
        // 차트 데이터 초기화
        prepareSortedData([]);
        updateChart(chart2);
        
        // 통계 데이터 초기화
        updateStatistics([]);
        
        // 맵 스타일 초기화
        prisonsMap.setPaintProperty('north-korea-layer', 'circle-color', '#007cbf'); // 기본 색상 복원
        prisonsMap.setPaintProperty('north-korea-layer', 'circle-radius', 6); // 기본 크기 복원
        
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
