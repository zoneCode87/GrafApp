// resources/js/graph.js

export class GraphManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.graphs = {};
        this.maxDataPoints = 5000;
        this.graphCounter = 0;
        this._equationCache = new Map();
    }

    addBasicGraph(sensorIds, sensorNames) {
        this.graphCounter++;
        const gId = `basic_${this.graphCounter}`;
        const scadaColors = ['#00FF00', '#00FFFF', '#FFB000', '#FF2A2A', '#CC00FF'];

        const traces = sensorIds.map((sId, index) => ({
            x: [], y: [],
            mode: 'lines+markers',
            name: sensorNames[index],
            line: { color: scadaColors[index % scadaColors.length], width: 1.5, shape: 'linear' },
            marker: { size: 5, color: '#050505', line: { width: 1.5, color: scadaColors[index % scadaColors.length] } },
            hovertemplate: 'Val: %{y:.2f}<extra></extra>'
        }));

        this.createGraphUI(gId, sensorNames.join(' & '), 'basic', sensorIds, null, traces);
    }

    addEquationGraph(graphName, equationString) {
        this.graphCounter++;
        const gId = `eq_${this.graphCounter}`;
        const trace = [{
            x: [], y: [],
            mode: 'lines+markers',
            name: graphName,
            line: { color: '#00FFFF', width: 1.5, shape: 'linear' },
            marker: { size: 5, color: '#050505', line: { width: 1.5, color: '#00FFFF' } },
            hovertemplate: 'Val: %{y:.2f}<extra></extra>'
        }];
        this.createGraphUI(gId, graphName, 'equation', null, equationString, trace);
    }

    createGraphUI(graphId, graphTitle, type, sensorIds, equation, tracesData) {
        const placeholder = this.container.querySelector('.graph-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        // ── Wrapper ───────────────────────────────────────────────────────────
        const wrapper = document.createElement('div');
        wrapper.className = 'graph-wrapper';
        wrapper.style.cssText = 'width:100%;box-sizing:border-box;background-color:#050505;padding:15px;padding-top:60px;border-radius:4px;border:1px solid #1f2937;position:relative;overflow:hidden;box-shadow:inset 0 0 10px rgba(0,0,0,0.8);margin-bottom:12px;';

        // ── Toolbar ───────────────────────────────────────────────────────────
        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = 'position:absolute;top:10px;left:10px;right:10px;z-index:10;display:flex;gap:6px;align-items:center;flex-wrap:wrap;';

        // helper — اسم البارامتر tooltip مش title عشان ما يتعارض مع graphTitle
        const mkBtn = (html, tooltip, bgColor, textColor, borderColor) => {
            const b = document.createElement('button');
            b.innerHTML = html;
            b.title = tooltip;
            b.className = 'pure-button';
            b.style.cssText = `padding:4px 9px;font-size:0.72rem;border-radius:2px;cursor:pointer;font-family:monospace;transition:all 0.2s;background-color:${bgColor};color:${textColor};border:1px solid ${borderColor};`;
            return b;
        };

        const sep = () => {
            const s = document.createElement('span');
            s.style.cssText = 'color:#333;font-size:0.9rem;user-select:none;';
            s.textContent = '│';
            return s;
        };

        const autoScrollBtn = mkBtn('<i class="fa-solid fa-lock"></i> Auto',                          'Toggle Auto-Scroll',  '#003300', '#00FF00', '#00AA00');
        const zoomOutBtn    = mkBtn('<i class="fa-solid fa-magnifying-glass-minus"></i> Fit',         'Fit all data',        '#1a1a1a', '#FFB000', '#554400');
        const zoomXInBtn    = mkBtn('<i class="fa-solid fa-compress"></i> X+',                        'Zoom in time axis',   '#1a1a1a', '#00FFFF', '#005555');
        const zoomXOutBtn   = mkBtn('<i class="fa-solid fa-expand"></i> X-',                          'Zoom out time axis',  '#1a1a1a', '#00FFFF', '#005555');
        const yUpBtn        = mkBtn('<i class="fa-solid fa-arrow-up"></i>',                           'Scroll Y up',         '#1a1a1a', '#CC00FF', '#440055');
        const yDownBtn      = mkBtn('<i class="fa-solid fa-arrow-down"></i>',                         'Scroll Y down',       '#1a1a1a', '#CC00FF', '#440055');
        const csvBtn        = mkBtn('<i class="fa-solid fa-download"></i> CSV',                       'Download CSV',        '#1a1a1a', '#888888', '#333333');
        const deleteBtn     = mkBtn('<i class="fa-solid fa-trash"></i>',                              'Remove graph',        '#330000', '#FF2A2A', '#FF2A2A');
        deleteBtn.style.marginLeft = 'auto';

        controlsDiv.append(
            autoScrollBtn, zoomOutBtn,
            sep(), zoomXInBtn, zoomXOutBtn,
            sep(), yUpBtn, yDownBtn,
            sep(), csvBtn, deleteBtn
        );
        wrapper.appendChild(controlsDiv);

        // ── Equation hint ─────────────────────────────────────────────────────
        if (type === 'equation') {
            const eqHint = document.createElement('div');
            eqHint.innerHTML = `<i class="fa-solid fa-calculator"></i> <code>f(x) = ${equation}</code>`;
            eqHint.style.cssText = 'color:#00FFFF;font-family:monospace;font-size:0.82rem;position:absolute;top:42px;left:12px;opacity:0.7;';
            wrapper.appendChild(eqHint);
        }

        // ── Plot div ──────────────────────────────────────────────────────────
        const plotDiv = document.createElement('div');
        plotDiv.id = `plot-${graphId}`;
        plotDiv.style.cssText = 'width:100%;height:300px;';
        wrapper.appendChild(plotDiv);
        this.container.appendChild(wrapper);

        // ── Graph state ───────────────────────────────────────────────────────
        const g = {
            div: plotDiv,
            type,
            sensorIds,
            equation,
            autoScroll: true,
            windowMin: Infinity,
            windowMax: -Infinity,
            _frameCount: 0,
            _internalRelayout: false,
        };
        this.graphs[graphId] = g;

        // ── Auto-scroll UI ────────────────────────────────────────────────────
        const setAutoScroll = (on) => {
            g.autoScroll = on;
            if (on) {
                autoScrollBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Auto';
                autoScrollBtn.style.backgroundColor = '#003300';
                autoScrollBtn.style.color = '#00FF00';
                autoScrollBtn.style.border = '1px solid #00AA00';
            } else {
                autoScrollBtn.innerHTML = '<i class="fa-solid fa-unlock"></i> Free';
                autoScrollBtn.style.backgroundColor = '#1a1a1a';
                autoScrollBtn.style.color = '#888';
                autoScrollBtn.style.border = '1px solid #444';
            }
        };

        // ── Button handlers ───────────────────────────────────────────────────
        autoScrollBtn.onclick = () => setAutoScroll(!g.autoScroll);

        plotDiv.addEventListener('dblclick', () => {
            if (!g.autoScroll) setAutoScroll(true);
        });

        zoomOutBtn.onclick = () => {
            g._internalRelayout = true;
            Plotly.relayout(plotDiv, { 'xaxis.autorange': true, 'yaxis.autorange': true })
                .then(() => { g._internalRelayout = false; });
            setAutoScroll(false);
        };

        const zoomXBy = (factor) => {
            const layout = plotDiv.layout;
            if (!layout.xaxis || !layout.xaxis.range) return;
            const [x0, x1] = layout.xaxis.range.map(v => new Date(v).getTime());
            const centre = (x0 + x1) / 2;
            const half = ((x1 - x0) / 2) * factor;
            const newRange = [new Date(centre - half), new Date(centre + half)];
            g._internalRelayout = true;
            setAutoScroll(false);
            Plotly.relayout(plotDiv, { 'xaxis.range': newRange })
                .then(() => { g._internalRelayout = false; });
        };
        zoomXInBtn.onclick  = () => zoomXBy(0.6);
        zoomXOutBtn.onclick = () => zoomXBy(1.6);

        const scrollY = (direction) => {
            const layout = plotDiv.layout;
            if (!layout.yaxis || !layout.yaxis.range) return;
            const [y0, y1] = layout.yaxis.range;
            const delta = (y1 - y0) * 0.2 * direction;
            g._internalRelayout = true;
            setAutoScroll(false);
            Plotly.relayout(plotDiv, { 'yaxis.range': [y0 + delta, y1 + delta] })
                .then(() => { g._internalRelayout = false; });
        };
        yUpBtn.onclick   = () => scrollY(1);
        yDownBtn.onclick = () => scrollY(-1);

        // Wheel: plain → zoom X  |  Shift+wheel → scroll Y
        plotDiv.addEventListener('wheel', (e) => {
            e.preventDefault();
            const layout = plotDiv.layout;
            if (e.shiftKey) {
                if (!layout.yaxis || !layout.yaxis.range) return;
                const [y0, y1] = layout.yaxis.range;
                const delta = (y1 - y0) * 0.15 * (e.deltaY > 0 ? -1 : 1);
                g._internalRelayout = true;
                setAutoScroll(false);
                Plotly.relayout(plotDiv, { 'yaxis.range': [y0 + delta, y1 + delta] })
                    .then(() => { g._internalRelayout = false; });
            } else {
                if (!layout.xaxis || !layout.xaxis.range) return;
                const factor = e.deltaY > 0 ? 1.25 : 0.8;
                const [x0ms, x1ms] = layout.xaxis.range.map(v => new Date(v).getTime());
                const centre = (x0ms + x1ms) / 2;
                const half = ((x1ms - x0ms) / 2) * factor;
                const newRange = [new Date(centre - half), new Date(centre + half)];
                g._internalRelayout = true;
                setAutoScroll(false);
                Plotly.relayout(plotDiv, { 'xaxis.range': newRange })
                    .then(() => { g._internalRelayout = false; });
            }
        }, { passive: false });

        // CSV
        csvBtn.onclick = async () => {
            try {
                const traces = g.div.data;
                if (!traces?.length || !traces[0].x?.length) {
                    alert('⚠️ لا توجد بيانات لحفظها حتى الآن!');
                    return;
                }
                const rows = ['Time,' + traces.map(t => t.name).join(',')];
                const times = traces[0].x;
                for (let i = 0; i < times.length; i++) {
                    const d = new Date(times[i]);
                    const ts = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
                    const row = [ts];
                    for (let j = 0; j < traces.length; j++) {
                        row.push(traces[j].y[i] !== undefined ? traces[j].y[i].toFixed(2) : '');
                    }
                    rows.push(row.join(','));
                }
                const filePath = await Neutralino.os.showSaveDialog('Save SCADA Log', {
                    defaultPath: `SCADA_Log_${graphTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`,
                    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
                });
                if (filePath) {
                    await Neutralino.filesystem.writeFile(filePath, rows.join('\n'));
                    alert('✅ تم حفظ السجل بنجاح!');
                }
            } catch (err) { console.error(err); }
        };

        // Delete
        deleteBtn.onclick = () => {
            Plotly.purge(plotDiv);
            delete this.graphs[graphId];
            wrapper.remove();
            if (Object.keys(this.graphs).length === 0 && placeholder) {
                placeholder.style.display = 'block';
            }
        };

        // ── Plotly init ───────────────────────────────────────────────────────
        const layout = {
            title: {
                text: `[ SYS: ${graphTitle.toUpperCase()} ]`,
                font: { family: '"Courier New", Courier, monospace', color: '#888', size: 14 },
                x: 0.02, xanchor: 'left'
            },
            paper_bgcolor: '#050505',
            plot_bgcolor:  '#050505',
            margin: { l: 60, r: 25, t: 45, b: 35 },
            hovermode: 'x unified',
            hoverlabel: {
                bgcolor: '#000000', bordercolor: '#00FF00',
                font: { family: 'monospace', color: '#00FF00', size: 12 }
            },
            xaxis: {
                type: 'date', tickformat: '%H:%M:%S',
                tickfont: { family: 'monospace', color: '#888', size: 11 },
                gridcolor: '#1a1a1a', zeroline: false,
                showline: true, linecolor: '#333', linewidth: 2
            },
            yaxis: {
                tickfont: { family: 'monospace', color: '#888', size: 11 },
                gridcolor: '#1a1a1a', zerolinecolor: '#333', zerolinewidth: 1,
                showline: true, linecolor: '#333', linewidth: 2
            },
            showlegend: (type === 'basic' && sensorIds?.length > 1),
            legend: {
                orientation: 'h', y: 1.15, x: 1, xanchor: 'right',
                font: { family: 'monospace', color: '#ccc', size: 11 },
                bgcolor: 'transparent'
            },
            dragmode: 'pan'
        };

        // ✅ نضيف plotly_relayout listener داخل .then() — بعد ما Plotly يهيئ الـ element
        Plotly.newPlot(plotDiv, tracesData, layout, {
            responsive: true,
            displayModeBar: false,
            doubleClick: false,
            scrollZoom: false
        }).then(() => {
            plotDiv.on('plotly_relayout', (eventData) => {
                const userChanged =
                    'xaxis.range[0]' in eventData ||
                    'xaxis.range'    in eventData ||
                    'yaxis.range[0]' in eventData ||
                    'yaxis.range'    in eventData;

                if (userChanged && !g._internalRelayout) {
                    setAutoScroll(false);
                }
            });
        });
    }

    // ── evaluateEquation (cached) ─────────────────────────────────────────────
    evaluateEquation(equation, sensorDataObj) {
        try {
            let fn = this._equationCache.get(equation);
            if (!fn) {
                const keys = Object.keys(sensorDataObj);
                fn = new Function(...keys, `return ${equation};`);
                this._equationCache.set(equation, fn);
            }
            return fn(...Object.values(sensorDataObj).map(v => parseFloat(v) || 0));
        } catch {
            return null;
        }
    }

    // ── updateAllGraphs ───────────────────────────────────────────────────────
    updateAllGraphs(sensorDataObj) {
        const now = new Date();
        const nowMs = now.getTime();
        const halfWindowMs = 15_000;
        const pastTime   = new Date(nowMs - halfWindowMs);
        const futureTime = new Date(nowMs + halfWindowMs);
        const pastMs = pastTime.getTime();

        for (const gId in this.graphs) {
            const g = this.graphs[gId];
            const newYValues = [];

            if (g.type === 'basic') {
                const updateX = [], updateY = [], traceIndices = [];
                g.sensorIds.forEach((sId, idx) => {
                    if (sensorDataObj[sId] !== undefined) {
                        const val = parseFloat(sensorDataObj[sId]);
                        updateX.push([now]);
                        updateY.push([val]);
                        traceIndices.push(idx);
                        newYValues.push(val);
                    }
                });
                if (traceIndices.length > 0) {
                    Plotly.extendTraces(g.div, { x: updateX, y: updateY }, traceIndices, this.maxDataPoints);
                }
            } else if (g.type === 'equation') {
                const val = this.evaluateEquation(g.equation, sensorDataObj);
                if (val !== null && !isNaN(val)) {
                    Plotly.extendTraces(g.div, { x: [[now]], y: [[val]] }, [0], this.maxDataPoints);
                    newYValues.push(val);
                }
            }

            if (!g.autoScroll || newYValues.length === 0) continue;

            for (const v of newYValues) {
                if (v < g.windowMin) g.windowMin = v;
                if (v > g.windowMax) g.windowMax = v;
            }

            g._frameCount++;
            if (g._frameCount % 50 === 0) {
                g.windowMin = Infinity;
                g.windowMax = -Infinity;
                for (const trace of g.div.data) {
                    for (let i = trace.x.length - 1; i >= 0; i--) {
                        if (new Date(trace.x[i]).getTime() < pastMs) break;
                        const yVal = trace.y[i];
                        if (yVal < g.windowMin) g.windowMin = yVal;
                        if (yVal > g.windowMax) g.windowMax = yVal;
                    }
                }
            }

            const layoutUpdate = { 'xaxis.range': [pastTime, futureTime] };

            if (g.windowMin !== Infinity && g.windowMax !== -Infinity) {
                let range = g.windowMax - g.windowMin;
                if (range === 0) range = 1;
                const pad = range * 0.2;
                layoutUpdate['yaxis.range']     = [g.windowMin - pad, g.windowMax + pad];
                layoutUpdate['yaxis.autorange'] = false;
            }

            g._internalRelayout = true;
            Plotly.relayout(g.div, layoutUpdate)
                .then(() => { g._internalRelayout = false; });
        }
    }
}