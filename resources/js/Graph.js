// resources/js/graph.js

export class GraphManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.graphs = {}; 
        this.maxDataPoints = 5000; 
        this.graphCounter = 0; 
    }

    addBasicGraph(sensorIds, sensorNames) {
        this.graphCounter++;
        let gId = `basic_${this.graphCounter}`;
        
        let traces = sensorIds.map((sId, index) => {
            const scadaColors = ['#00FF00', '#00FFFF', '#FFB000', '#FF2A2A', '#CC00FF']; 
            return {
                x: [], y: [],
                mode: 'lines+markers', 
                name: sensorNames[index],
                line: { color: scadaColors[index % scadaColors.length], width: 1.5, shape: 'linear' },
                marker: { size: 5, color: '#050505', line: { width: 1.5, color: scadaColors[index % scadaColors.length] } },
                hovertemplate: 'Val: %{y:.2f}<extra></extra>' 
            };
        });

        let title = sensorNames.join(' & ');
        this.createGraphUI(gId, title, 'basic', sensorIds, null, traces);
    }

    addEquationGraph(graphName, equationString) {
        this.graphCounter++;
        let gId = `eq_${this.graphCounter}`;
        let trace = [{
            x: [], y: [],
            mode: 'lines+markers',
            name: graphName,
            line: { color: '#00FFFF', width: 1.5, shape: 'linear' },
            marker: { size: 5, color: '#050505', line: { width: 1.5, color: '#00FFFF' } },
            hovertemplate: 'Val: %{y:.2f}<extra></extra>'
        }];
        this.createGraphUI(gId, graphName, 'equation', null, equationString, trace);
    }

    createGraphUI(graphId, title, type, sensorIds, equation, tracesData) {
        const placeholder = this.container.querySelector('.graph-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'graph-wrapper';
        wrapper.style.cssText = 'width: 100%; box-sizing: border-box; background-color: #050505; padding: 15px; padding-top: 55px; border-radius: 4px; border: 1px solid #1f2937; position: relative; overflow: hidden; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);';

        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = 'position: absolute; top: 12px; right: 12px; z-index: 10; display: flex; gap: 8px;';

        const autoScrollBtn = document.createElement('button');
        autoScrollBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Auto Scroll';
        autoScrollBtn.className = 'pure-button btn-primary';
        autoScrollBtn.style.cssText = 'padding: 5px 10px; font-size: 0.75rem; border-radius: 2px; cursor: pointer; transition: 0.3s; background-color: #008000; color: #00FF00; border: 1px solid #00FF00; font-family: monospace;';

        const csvBtn = document.createElement('button');
        csvBtn.innerHTML = '<i class="fa-solid fa-download"></i> CSV';
        csvBtn.className = 'pure-button';
        csvBtn.style.cssText = 'background-color: #1a1a1a; color: #00FFFF; border: 1px solid #00FFFF; padding: 5px 10px; font-size: 0.75rem; border-radius: 2px; cursor: pointer; font-family: monospace;';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteBtn.className = 'pure-button button-error btn-icon-only';
        deleteBtn.style.cssText = 'padding: 5px 8px; border-radius: 2px; background-color: #330000; color: #FF2A2A; border: 1px solid #FF2A2A;';

        controlsDiv.appendChild(autoScrollBtn);
        controlsDiv.appendChild(csvBtn);
        controlsDiv.appendChild(deleteBtn);
        wrapper.appendChild(controlsDiv);

        const plotDiv = document.createElement('div');
        plotDiv.id = `plot-${graphId}`;
        plotDiv.style.cssText = 'width: 100%; height: 300px;';

        if (type === 'equation') {
            const eqHint = document.createElement('div');
            eqHint.innerHTML = `<i class="fa-solid fa-calculator"></i> <code>f(x) = ${equation}</code>`;
            eqHint.style.cssText = 'color: #00FFFF; font-family: monospace; font-size: 0.85rem; position: absolute; top: 15px; left: 15px;';
            wrapper.appendChild(eqHint);
        }

        wrapper.appendChild(plotDiv);
        this.container.appendChild(wrapper);

        this.graphs[graphId] = {
            div: plotDiv, type: type, sensorIds: sensorIds, equation: equation, autoScroll: true
        };

        // زر الـ Auto Scroll
        autoScrollBtn.onclick = () => {
            let g = this.graphs[graphId];
            g.autoScroll = !g.autoScroll;
            if (g.autoScroll) {
                autoScrollBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Auto Scroll';
                autoScrollBtn.style.backgroundColor = '#008000';
                autoScrollBtn.style.color = '#00FF00';
                autoScrollBtn.style.border = '1px solid #00FF00';
            } else {
                autoScrollBtn.innerHTML = '<i class="fa-solid fa-unlock"></i> Free Scroll';
                autoScrollBtn.style.backgroundColor = '#1a1a1a';
                autoScrollBtn.style.color = '#888';
                autoScrollBtn.style.border = '1px solid #444';
            }
        };

        // حدث النقر المزدوج (Double Click) ليعيد تفعيل الـ Auto Scroll بدلاً من التكبير العشوائي
        plotDiv.addEventListener('dblclick', () => {
            let g = this.graphs[graphId];
            if (!g.autoScroll) {
                g.autoScroll = true; // تفعيل السكرول
                autoScrollBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Auto Scroll';
                autoScrollBtn.style.backgroundColor = '#008000';
                autoScrollBtn.style.color = '#00FF00';
                autoScrollBtn.style.border = '1px solid #00FF00';
            }
        });

        // زر الـ CSV
        csvBtn.onclick = async () => {
            try {
                let g = this.graphs[graphId];
                let traces = g.div.data; 
                if (!traces || traces.length === 0 || !traces[0].x || traces[0].x.length === 0) {
                    alert("⚠️ لا توجد بيانات لحفظها حتى الآن!"); return;
                }
                let csvContent = "Time,";
                let headers = traces.map(t => t.name).join(",");
                csvContent += headers + "\n";
                let times = traces[0].x;
                for (let i = 0; i < times.length; i++) {
                    let d = new Date(times[i]);
                    let timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
                    let row = [timeStr];
                    for (let j = 0; j < traces.length; j++) {
                        row.push(traces[j].y[i] !== undefined ? traces[j].y[i].toFixed(2) : "");
                    }
                    csvContent += row.join(",") + "\n";
                }
                let cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_'); 
                let filePath = await Neutralino.os.showSaveDialog('Save SCADA Log', {
                    defaultPath: `SCADA_Log_${cleanTitle}.csv`,
                    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
                });
                if (filePath) {
                    await Neutralino.filesystem.writeFile(filePath, csvContent);
                    alert("✅ تم حفظ السجل بنجاح!");
                }
            } catch (err) { console.error(err); }
        };

        // زر الحذف
        deleteBtn.onclick = () => {
            Plotly.purge(plotDiv);
            delete this.graphs[graphId];
            wrapper.remove();
            if (Object.keys(this.graphs).length === 0 && placeholder) placeholder.style.display = 'block';
        };

        const layout = {
            title: { 
                text: `[ SYS: ${title.toUpperCase()} ]`, 
                font: { family: '"Courier New", Courier, monospace', color: '#888', size: 14 },
                x: 0.02, xanchor: 'left'
            },
            paper_bgcolor: '#050505', 
            plot_bgcolor: '#050505',
            margin: { l: 60, r: 25, t: 45, b: 35 }, 
            
            hovermode: 'x unified', 
            hoverlabel: {
                bgcolor: '#000000', 
                bordercolor: '#00FF00', 
                font: { family: 'monospace', color: '#00FF00', size: 12 }
            },

            xaxis: { 
                type: 'date',
                tickformat: '%H:%M:%S',
                tickfont: { family: 'monospace', color: '#888', size: 11 }, 
                gridcolor: '#1a1a1a', 
                zeroline: false,
                showline: true, 
                linecolor: '#333',
                linewidth: 2
            },
            yaxis: { 
                tickfont: { family: 'monospace', color: '#888', size: 11 }, 
                gridcolor: '#1a1a1a',
                zerolinecolor: '#333', 
                zerolinewidth: 1,
                showline: true,
                linecolor: '#333',
                linewidth: 2
                // تم إزالة autorange من هنا لأننا سنحسبها يدوياً بدقة مع إضافة padding
            },
            showlegend: (type === 'basic' && sensorIds.length > 1),
            legend: {
                orientation: 'h', y: 1.15, x: 1, xanchor: 'right',
                font: { family: 'monospace', color: '#ccc', size: 11 },
                bgcolor: 'transparent'
            }
        };

        // قمنا بإضافة doubleClick: false لإيقاف الزوم الافتراضي لـ Plotly
        Plotly.newPlot(plotDiv, tracesData, layout, { responsive: true, displayModeBar: false, doubleClick: false });
    }

    evaluateEquation(equation, sensorDataObj) {
        try {
            let keys = Object.keys(sensorDataObj);
            let values = Object.values(sensorDataObj).map(v => parseFloat(v) || 0);
            let func = new Function(...keys, `return ${equation};`);
            return func(...values);
        } catch (e) {
            return null;
        }
    }

    updateAllGraphs(sensorDataObj) {
        let exactTime = new Date(); 
        let halfWindowMs = 15 * 1000; 
        let pastTime = new Date(exactTime.getTime() - halfWindowMs);
        let futureTime = new Date(exactTime.getTime() + halfWindowMs); 

        for (let gId in this.graphs) {
            let g = this.graphs[gId];
            let hasNewData = false;

            if (g.type === 'basic') {
                let updateX = [];
                let updateY = [];
                let traceIndices = [];

                g.sensorIds.forEach((sId, index) => {
                    if (sensorDataObj[sId] !== undefined) {
                        updateX.push([exactTime]);
                        updateY.push([parseFloat(sensorDataObj[sId])]);
                        traceIndices.push(index);
                    }
                });

                if (traceIndices.length > 0) {
                    Plotly.extendTraces(g.div, { x: updateX, y: updateY }, traceIndices, this.maxDataPoints);
                    hasNewData = true;
                }
            } 
            else if (g.type === 'equation') {
                let targetValue = this.evaluateEquation(g.equation, sensorDataObj);
                if (targetValue !== null && !isNaN(targetValue)) {
                    Plotly.extendTraces(g.div, { x: [[exactTime]], y: [[targetValue]] }, [0], this.maxDataPoints);
                    hasNewData = true;
                }
            }

            if (hasNewData && g.autoScroll) {
                // حساب أعلى وأقل قيمة (Min / Max) ضمن الإطار الزمني الظاهر حالياً لإضافة الـ Padding
                let minY = Infinity;
                let maxY = -Infinity;
                
                g.div.data.forEach(trace => {
                    for(let i = trace.x.length - 1; i >= 0; i--) {
                        let pTime = new Date(trace.x[i]).getTime();
                        if (pTime < pastTime.getTime()) break; // إذا تخطينا الماضي نتوقف لزيادة السرعة
                        
                        if (pTime <= futureTime.getTime()) {
                            let yVal = trace.y[i];
                            if (yVal < minY) minY = yVal;
                            if (yVal > maxY) maxY = yVal;
                        }
                    }
                });

                let layoutUpdate = {
                    'xaxis.range': [pastTime, futureTime]
                };

                // تطبيق الهامش (Padding) بنسبة 20%
                if (minY !== Infinity && maxY !== -Infinity) {
                    let range = maxY - minY;
                    if (range === 0) range = 1; // تفادي القسمة على صفر في حال كان الخط مستقيم ثابت
                    let yPadding = range * 0.2; // 20% فراغ من الأعلى والأسفل

                    layoutUpdate['yaxis.range'] = [minY - yPadding, maxY + yPadding];
                    layoutUpdate['yaxis.autorange'] = false; 
                }

                Plotly.relayout(g.div, layoutUpdate);
            }
        }
    }
}