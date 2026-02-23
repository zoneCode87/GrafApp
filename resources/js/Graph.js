// resources/js/graph.js

export class GraphManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.graphs = {}; 
        this.maxDataPoints = 5000; // الذاكرة تحتفظ بـ 5000 قراءة (تاريخ طويل)
        this.graphCounter = 0; 
    }

    // 1. إضافة رسم عادي يدعم عدة حساسات
    addBasicGraph(sensorIds, sensorNames) {
        this.graphCounter++;
        let gId = `basic_${this.graphCounter}`;
        
        let traces = sensorIds.map((sId, index) => {
            const colors = ['#0ea5e9', '#10b981', '#f59e0b']; 
            return {
                x: [], y: [],
                mode: 'lines+markers',
                name: sensorNames[index],
                line: { color: colors[index % colors.length], width: 2.5, shape: 'spline' },
                marker: { size: 5 }
            };
        });

        let title = sensorNames.join(' & ');
        this.createGraphUI(gId, title, 'basic', sensorIds, null, traces);
    }

    // 2. إضافة رسم يعتمد على معادلة
    addEquationGraph(graphName, equationString) {
        this.graphCounter++;
        let gId = `eq_${this.graphCounter}`;
        let trace = [{
            x: [], y: [],
            mode: 'lines+markers',
            name: graphName,
            line: { color: '#8b5cf6', width: 2.5, shape: 'spline' },
            marker: { size: 5 }
        }];
        this.createGraphUI(gId, graphName, 'equation', null, equationString, trace);
    }

    // بناء الواجهة (بإضافة الأزرار الجديدة)
    createGraphUI(graphId, title, type, sensorIds, equation, tracesData) {
        const placeholder = this.container.querySelector('.graph-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'graph-wrapper';
        // قمنا بزيادة padding-top إلى 55px لترك مساحة كافية للأزرار العلوية
        wrapper.style.cssText = 'width: 100%; box-sizing: border-box; background-color: var(--bg-panel); padding: 15px; padding-top: 55px; border-radius: 8px; border: 1px solid var(--border-color); position: relative; overflow: hidden;';

        // ==========================================
        // إنشاء شريط الأدوات لكل رسم بياني (Auto Scroll + CSV + Delete)
        // ==========================================
        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = 'position: absolute; top: 12px; right: 12px; z-index: 10; display: flex; gap: 8px;';

        const autoScrollBtn = document.createElement('button');
        autoScrollBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Auto Scroll';
        autoScrollBtn.className = 'pure-button btn-primary';
        autoScrollBtn.style.cssText = 'padding: 5px 10px; font-size: 0.75rem; border-radius: 4px; cursor: pointer; transition: 0.3s;';

        const csvBtn = document.createElement('button');
        csvBtn.innerHTML = '<i class="fa-solid fa-download"></i> Save CSV';
        csvBtn.className = 'pure-button';
        csvBtn.style.cssText = 'background-color: #10b981; color: white; border: none; padding: 5px 10px; font-size: 0.75rem; border-radius: 4px; cursor: pointer;';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteBtn.className = 'pure-button button-error btn-icon-only';
        deleteBtn.style.cssText = 'padding: 5px 8px; border-radius: 4px;';

        controlsDiv.appendChild(autoScrollBtn);
        controlsDiv.appendChild(csvBtn);
        controlsDiv.appendChild(deleteBtn);
        wrapper.appendChild(controlsDiv);

        const plotDiv = document.createElement('div');
        plotDiv.id = `plot-${graphId}`;
        plotDiv.style.cssText = 'width: 100%; height: 280px;';

        // إظهار المعادلة على اليسار إذا كان نوعه معادلة
        if (type === 'equation') {
            const eqHint = document.createElement('div');
            eqHint.innerHTML = `<i class="fa-solid fa-calculator"></i> <code>f(x) = ${equation}</code>`;
            eqHint.style.cssText = 'color: #94a3b8; font-size: 0.85rem; position: absolute; top: 15px; left: 15px;';
            wrapper.appendChild(eqHint);
        }

        wrapper.appendChild(plotDiv);
        this.container.appendChild(wrapper);

        // حفظ بيانات الرسم مع ميزة autoScroll مفعلة افتراضياً
        this.graphs[graphId] = {
            div: plotDiv, type: type, sensorIds: sensorIds, equation: equation, autoScroll: true
        };

        // ==========================================
        // برمجة الأزرار
        // ==========================================

        // زر التمرير (Scroll Toggle)
        autoScrollBtn.onclick = () => {
            let g = this.graphs[graphId];
            g.autoScroll = !g.autoScroll; // عكس الحالة
            if (g.autoScroll) {
                autoScrollBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Auto Scroll';
                autoScrollBtn.className = 'pure-button btn-primary';
                autoScrollBtn.style.backgroundColor = 'var(--accent-blue)';
                autoScrollBtn.style.border = 'none';
            } else {
                autoScrollBtn.innerHTML = '<i class="fa-solid fa-unlock"></i> Free Scroll';
                autoScrollBtn.className = 'pure-button btn-ghost';
                autoScrollBtn.style.backgroundColor = 'transparent';
                autoScrollBtn.style.border = '1px solid #475569';
                autoScrollBtn.style.color = '#94a3b8';
            }
        };

        // زر حفظ الـ CSV للرسم الحالي فقط
        csvBtn.onclick = async () => {
            try {
                let g = this.graphs[graphId];
                let traces = g.div.data; 
                
                if (!traces || traces.length === 0 || !traces[0].x || traces[0].x.length === 0) {
                    alert("⚠️ لا توجد بيانات لحفظها حتى الآن!");
                    return;
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
                
                let cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_'); // تنظيف الاسم ليناسب الويندوز
                let filePath = await Neutralino.os.showSaveDialog('Save Graph Data', {
                    defaultPath: `Graph_${cleanTitle}.csv`,
                    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
                });
                
                if (filePath) {
                    await Neutralino.filesystem.writeFile(filePath, csvContent);
                    alert("✅ تم حفظ بيانات الرسم بنجاح!");
                }
            } catch (err) {
                console.error("❌ خطأ أثناء حفظ الـ CSV:", err);
                alert("حدث خطأ أثناء الحفظ!");
            }
        };

        // زر الحذف
        deleteBtn.onclick = () => {
            Plotly.purge(plotDiv);
            delete this.graphs[graphId];
            wrapper.remove();
            if (Object.keys(this.graphs).length === 0 && placeholder) placeholder.style.display = 'block';
        };

        // إعدادات Plotly
// إعدادات Plotly (تم تحسين الـ Y-axis لإظهار التفاصيل والفواصل)
// إعدادات Plotly
        const layout = {
            title: { text: title, font: { color: '#e2e8f0', size: 16 } },
            paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
            margin: { l: 45, r: 20, t: 30, b: 30 },
            xaxis: { 
                type: 'date',
                tickformat: '%H:%M:%S',
                tickfont: { color: '#94a3b8' }, 
                gridcolor: '#2d3748' 
            },
            yaxis: { 
                tickfont: { color: '#94a3b8' }, 
                gridcolor: '#2d3748',
                hoverformat: '.2f' // سيعرض لك القيمة الدقيقة بفاصلتين عند وضع الماوس على النقطة
                // أزلنا nticks و tickformat لكي يختار Plotly الشكل الأنسب والمريح للعين تلقائياً
            },
            showlegend: (type === 'basic' && sensorIds.length > 1)
        };

        Plotly.newPlot(plotDiv, tracesData, layout, { responsive: true, displayModeBar: false });
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
        let viewWindowMs = 20 * 1000; // الإطار الزمني للـ Scroll (20 ثانية)
        
        // --- التعديل هنا لعمل الـ Gap ---
        let futureOffsetMs = 1500; // مقدار المسافة (ثانية ونصف للمستقبل)
        let pastTime = new Date(exactTime.getTime() - viewWindowMs);
        let futureTime = new Date(exactTime.getTime() + futureOffsetMs); 
        // --------------------------------

        for (let gId in this.graphs) {
            let g = this.graphs[gId];
            let hasNewData = false;

            // 1. إضافة البيانات الجديدة
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

            // 2. تحديث الشاشة فقط إذا كان (Auto Scroll) مفعلاً
            if (hasNewData && g.autoScroll) {
                Plotly.relayout(g.div, {
                    // --- استخدام futureTime بدلاً من exactTime ---
                    'xaxis.range': [pastTime, futureTime] 
                });
            }
        }
    }
}