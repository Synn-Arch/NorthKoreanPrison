mapboxgl.accessToken = 'pk.eyJ1Ijoic3lubmdhdGVjaCIsImEiOiJjbTF4dGF1cTkwdnZ1MmtxMWRwNDgwazVpIn0.aoTqmmjvf-wJDx-0zbBq5A';

const regionsMap = new mapboxgl.Map({
    container: 'regionsMap', // ID가 다르므로 고유하게 사용
    style: 'mapbox://styles/synngatech/cm2tit89i00ix01qi8cq205c3',
    center: [127.05593, 40.34743],
    zoom: 6.33
});

let allFeaturesData = [];
let sortedLabels = []; // 정렬된 라벨 전역 변수
let sortedData = []; // 정렬된 데이터 전역 변수
let selectedFeatures = []; // 선택된 피처들 저장

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

    // 데이터 집계
    const aggregated = selectedData.reduce((acc, feature) => {
        const counts = filterCountProperties(feature.properties);
        for (const [key, value] of Object.entries(counts)) {
            acc[key] = (acc[key] || 0) + value;
        }
        return acc;
    }, {});

    // 라벨과 데이터 정렬
    const sortedEntries = Object.entries(aggregated)
        .map(([key, value]) => ({ label: key.replace('_count', ''), value })) // 라벨과 값 매핑
        .sort((a, b) => a.label.localeCompare(b.label)); // ABC 순 정렬

    // 정렬된 결과를 전역 변수에 저장
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

    // 선택된 위치 이름들
    const locations = selectedData.map(feature => feature.properties['Location Where the Violation Occurred']);
    const locationString = locations.join(', ');

    // 제목 업데이트
    chart2Title.innerHTML = locations.length > 1 ? `Details for Multiple Locations` : `Details for ${locations[0]}`;

    // 부가 설명 업데이트
    chart2Description.innerHTML = `
        <p>
            This chart shows the combined violation counts for the selected locations: <strong>${locationString}</strong>.
        </p>
    `;

    // 통계 업데이트
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

const ctx1 = document.getElementById('chart1').getContext('2d');
const chart1 = new Chart(ctx1, createChartConfig());
const ctx2 = document.getElementById('chart2').getContext('2d');
const chart2 = new Chart(ctx2, createChartConfig());

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

                            const maxCharsPerLine = 10;
                            let lines = [];
                            for (let i = 0; i < label.length; i += maxCharsPerLine) {
                                lines.push(label.slice(i, i + maxCharsPerLine));
                            }
                            return lines;
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
            'circle-color': '#007cbf'
        }
    });

    regionsMap.addLayer({
        id: 'north-korea-hit-area',
        type: 'circle',
        source: 'north-korea-tileset',
        'source-layer': 'rev_filtered_north_korea_data-2c9c11',
        paint: {
            'circle-radius': 6.2, // 히트 영역 크기
            'circle-color': 'rgba(0, 0, 0, 0)' // 투명한 색상
        }
    });

    fetch('https://Synn-Arch.github.io/NorthKoreanPrisons/rev_filtered_north_korea_data.geojson')
    .then(response => response.json())
    .then(data => {
        // 각 Feature에 고유 ID 추가
        data.features.forEach((feature, index) => {
            feature.id = feature.id || `feature-${index}`; // 기존 ID가 없으면 고유 ID 생성
        });
        allFeaturesData = data.features;
        prepareSortedData(allFeaturesData);
        updateChart(chart1);
    });

    regionsMap.on('click', 'north-korea-hit-area', (e) => {
    const clickedFeatures = e.features || [];
        
        // Ctrl(Windows/Linux) 또는 Cmd(macOS) 키를 누른 상태로 클릭한 경우 추가
        if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
            // 중복되지 않도록 기존 선택과 새 선택을 병합
            selectedFeatures = [...new Set([...selectedFeatures, ...clickedFeatures])];
        } else {
            // Ctrl/Cmd 키를 누르지 않은 경우 새로 선택
            selectedFeatures = clickedFeatures;
        }
        
        if (selectedFeatures.length > 0) {
            // 정렬된 데이터를 준비하고 차트2 업데이트
            prepareSortedData(selectedFeatures);
            updateChart(chart2);
            updateStatistics(selectedFeatures);
        } else {
            console.log('No features selected.');
        }
    });

    regionsMap.on('click', (e) => {
        const clickedFeatures = map.queryRenderedFeatures(e.point, {
            layers: ['north-korea-layer']
        });
    
        // 점 외부를 클릭하면 선택 해제
        if (clickedFeatures.length === 0) {
            selectedFeatures = [];
            prepareSortedData(selectedFeatures);
            updateChart(chart2);
            updateStatistics(selectedFeatures);
            console.log('Selection cleared.');
            return;
        }
    });

    // Esc 키를 눌렀을 때 선택 해제
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            selectedFeatures = [];
            prepareSortedData(selectedFeatures);
            updateChart(chart2);
            updateStatistics(selectedFeatures);
            console.log('Selection cleared by Esc key.');
        }
    });
        

    regionsMap.on('mouseenter', 'north-korea-layer', (e) => {
        const feature = e.features[0]; // 첫 번째 피처 가져오기
        if (feature) {
            const properties = feature.properties;
            const location = properties['Location Where the Violation Occurred'];

            // `_count`로 끝나는 속성 필터링
            const counts = Object.entries(properties)
                .filter(([key, value]) => key.endsWith('_count') && value !== null)
                .regionsMap(([key, value]) => `<strong>${key.replace('_count', '')}:</strong> ${value}`)
                .join('<br>');

            // Tooltip 내용 생성
            const tooltipHTML = `
                <div>
                    <h4>${location}</h4>
                    ${counts}
                </div>
            `;

            // Popup 설정
            const popup = new mapboxgl.Popup({ closeButton: false, offset: 10 })
                .setLngLat(feature.geometry.coordinates)
                .setHTML(tooltipHTML)
                .addTo(regionsMap);

            // 마우스가 나갈 때 팝업 제거
            regionsMap.on('mouseleave', 'north-korea-layer', () => {
                popup.remove();
                map.getCanvas().style.cursor = '';
            });

            // 커서 변경
            regionsMap.getCanvas().style.cursor = 'pointer';
        }
    });

    ctx1.canvas.onclick = (event) => {
        const points = chart1.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
    
        if (points.length > 0) {
            const clickedIndex = points[0].index; // 클릭된 bar의 인덱스
            const selectedLabel = chart1.data.labels[clickedIndex]; // 클릭된 bar의 라벨
            const selectedValue = chart1.data.datasets[0].data[clickedIndex]; // 클릭된 bar의 값
    
            console.log(`Selected Label: ${selectedLabel}, Value: ${selectedValue}`);
    
            // 지도 위 포인트의 크기를 업데이트
            updateMapPointSizes(selectedLabel, selectedValue);
        }
    };

    function updateMapPointSizes(selectedLabel, selectedValue) {
        const duration = 100; // 애니메이션 지속 시간 (밀리초)
        const steps = 30; // 애니메이션 프레임 수
        const startRadius = 6; // 초기 크기
        const endRadiusScale = 100; // 스케일링 팩터
    
        // 점 크기 업데이트를 위한 함수
        function animateStep(step) {
            const t = step / steps; // 현재 단계 비율 (0 ~ 1)
            const currentRadiusScale = startRadius + t * (endRadiusScale - startRadius);
    
            // Mapbox 스타일 표현식 업데이트
            regionsMap.setPaintProperty('north-korea-layer', 'circle-radius', [
                'case',
                ['==', ['get', `${selectedLabel}_count`], null], 6, // 값이 없는 경우 기본 크기
                [
                    '*',
                    ['/', ['get', `${selectedLabel}_count`], selectedValue], // 선택된 값에 비례
                    currentRadiusScale // 점진적으로 증가하는 스케일링 값
                ]
            ]);
    
            if (step < steps) {
                requestAnimationFrame(() => animateStep(step + 1)); // 다음 단계로 이동
            }
        }
    
        animateStep(0); // 애니메이션 시작
    }

    function resetSelection() {
        // 선택된 피처 및 차트 초기화
        selectedFeatures = [];
        prepareSortedData(selectedFeatures);
        updateChart(chart2);
        updateStatistics(selectedFeatures);
    
        // 지도 포인트 크기 초기화
        regionsMap.setPaintProperty('north-korea-layer', 'circle-radius', 6); // 기본 크기
    
        console.log('Selection cleared.');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            resetSelection();
        }
    });

    regionsMap.on('click', (e) => {
        const clickedFeatures = map.queryRenderedFeatures(e.point, {
            layers: ['north-korea-layer']
        });
    
        // 빈 부분 클릭 시 초기화
        if (clickedFeatures.length === 0) {
            resetSelection();
        }
    });

    ctx1.canvas.onclick = (event) => {
        const points = chart1.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
    
        if (points.length > 0) {
            const clickedIndex = points[0].index; // 클릭된 bar의 인덱스
            const selectedLabel = chart1.data.labels[clickedIndex]; // 클릭된 bar의 라벨
            const selectedValue = chart1.data.datasets[0].data[clickedIndex]; // 클릭된 bar의 값
    
            console.log(`Selected Label: ${selectedLabel}, Value: ${selectedValue}`);
    
            // 지도 위 포인트의 크기를 업데이트
            updateMapPointSizes(selectedLabel, selectedValue);
        } else {
            // 빈 부분 클릭 시 초기화
            resetSelection();
        }
    };

});


// 탭 전환 기능
document.querySelectorAll('.menu-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
    
        // 모든 탭과 컨텐츠 비활성화
        document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
        // 클릭한 탭과 해당 컨텐츠 활성화
        e.target.classList.add('active');
        document.getElementById(`${targetTab}Content`).classList.add('active');
    });
});