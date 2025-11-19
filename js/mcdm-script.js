// Variables globales
let currentMethod = null;

// Selección de método
function selectMethod(method) {
    currentMethod = method;
    
    // Ocultar todas las secciones
    document.getElementById('topsis-config').style.display = 'none';
    document.getElementById('ahp-config').style.display = 'none';
    document.getElementById('integrated-config').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    
    // Mostrar sección correspondiente
    if (method === 'topsis') {
        document.getElementById('topsis-config').style.display = 'block';
    } else if (method === 'ahp') {
        document.getElementById('ahp-config').style.display = 'block';
    } else if (method === 'integrated') {
        document.getElementById('integrated-config').style.display = 'block';
    }
    
    // Scroll suave a la sección
    setTimeout(() => {
        document.querySelector('.config-section').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// ===== TOPSIS =====
function generateTopsisForm() {
    const numAlternatives = parseInt(document.getElementById('topsis-alternatives').value);
    const numCriteria = parseInt(document.getElementById('topsis-criteria').value);
    
    const container = document.getElementById('topsis-form-container');
    container.innerHTML = '';
    
    // Tabla de decisión
    let html = '<div class="data-table"><h3>Matriz de Decisión</h3><table><thead><tr><th>Alternativa</th>';
    
    for (let j = 0; j < numCriteria; j++) {
        html += `<th>Criterio ${j + 1}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (let i = 0; i < numAlternatives; i++) {
        html += `<tr><td>Alternativa ${i + 1}</td>`;
        for (let j = 0; j < numCriteria; j++) {
            html += `<td><input type="number" step="0.01" id="topsis-val-${i}-${j}" value="0"></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    
    // Pesos y tipos
    html += '<div class="data-table"><h3>Configuración de Criterios</h3><table><thead><tr><th>Criterio</th><th>Peso</th><th>Tipo</th></tr></thead><tbody>';
    
    for (let j = 0; j < numCriteria; j++) {
        html += `<tr><td>Criterio ${j + 1}</td>`;
        html += `<td><input type="number" step="0.01" id="topsis-weight-${j}" value="${(1/numCriteria).toFixed(2)}"></td>`;
        html += `<td><select id="topsis-type-${j}"><option value="beneficio">Beneficio (↑)</option><option value="costo">Costo (↓)</option></select></td>`;
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    
    html += '<button class="btn-calculate" onclick="calculateTopsis()">Calcular TOPSIS</button>';
    
    container.innerHTML = html;
}

function calculateTopsis() {
    const numAlternatives = parseInt(document.getElementById('topsis-alternatives').value);
    const numCriteria = parseInt(document.getElementById('topsis-criteria').value);
    
    // Recopilar datos
    const matrix = [];
    for (let i = 0; i < numAlternatives; i++) {
        const row = [];
        for (let j = 0; j < numCriteria; j++) {
            row.push(parseFloat(document.getElementById(`topsis-val-${i}-${j}`).value));
        }
        matrix.push(row);
    }
    
    const weights = [];
    const types = [];
    for (let j = 0; j < numCriteria; j++) {
        weights.push(parseFloat(document.getElementById(`topsis-weight-${j}`).value));
        types.push(document.getElementById(`topsis-type-${j}`).value);
    }
    
    // Ejecutar TOPSIS
    const topsis = new TOPSIS(matrix, weights, types);
    const scores = topsis.calculate();
    
    // Mostrar resultados
    displayResults('TOPSIS', scores);
}

class TOPSIS {
    constructor(matrix, weights, types) {
        this.matrix = matrix;
        this.weights = weights;
        this.types = types;
        this.numAlternatives = matrix.length;
        this.numCriteria = matrix[0].length;
    }
    
    normalize() {
        const normalized = [];
        
        for (let j = 0; j < this.numCriteria; j++) {
            let sumSquares = 0;
            for (let i = 0; i < this.numAlternatives; i++) {
                sumSquares += this.matrix[i][j] ** 2;
            }
            const denominator = Math.sqrt(sumSquares);
            
            for (let i = 0; i < this.numAlternatives; i++) {
                if (!normalized[i]) normalized[i] = [];
                normalized[i][j] = this.matrix[i][j] / denominator;
            }
        }
        
        return normalized;
    }
    
    applyWeights(normalized) {
        const weighted = [];
        
        for (let i = 0; i < this.numAlternatives; i++) {
            weighted[i] = [];
            for (let j = 0; j < this.numCriteria; j++) {
                weighted[i][j] = normalized[i][j] * this.weights[j];
            }
        }
        
        return weighted;
    }
    
    findIdealSolutions(weighted) {
        const idealBest = [];
        const idealWorst = [];
        
        for (let j = 0; j < this.numCriteria; j++) {
            const column = weighted.map(row => row[j]);
            
            if (this.types[j] === 'beneficio') {
                idealBest[j] = Math.max(...column);
                idealWorst[j] = Math.min(...column);
            } else {
                idealBest[j] = Math.min(...column);
                idealWorst[j] = Math.max(...column);
            }
        }
        
        return { idealBest, idealWorst };
    }
    
    calculateDistances(weighted, idealBest, idealWorst) {
        const distancesBest = [];
        const distancesWorst = [];
        
        for (let i = 0; i < this.numAlternatives; i++) {
            let sumBest = 0;
            let sumWorst = 0;
            
            for (let j = 0; j < this.numCriteria; j++) {
                sumBest += (weighted[i][j] - idealBest[j]) ** 2;
                sumWorst += (weighted[i][j] - idealWorst[j]) ** 2;
            }
            
            distancesBest[i] = Math.sqrt(sumBest);
            distancesWorst[i] = Math.sqrt(sumWorst);
        }
        
        return { distancesBest, distancesWorst };
    }
    
    calculateScores(distancesBest, distancesWorst) {
        const scores = [];
        
        for (let i = 0; i < this.numAlternatives; i++) {
            scores[i] = distancesWorst[i] / (distancesBest[i] + distancesWorst[i]);
        }
        
        return scores;
    }
    
    calculate() {
        const normalized = this.normalize();
        const weighted = this.applyWeights(normalized);
        const { idealBest, idealWorst } = this.findIdealSolutions(weighted);
        const { distancesBest, distancesWorst } = this.calculateDistances(weighted, idealBest, idealWorst);
        const scores = this.calculateScores(distancesBest, distancesWorst);
        
        // Crear ranking
        const ranking = scores.map((score, index) => ({
            alternative: `Alternativa ${index + 1}`,
            score: score
        })).sort((a, b) => b.score - a.score);
        
        return ranking;
    }
}

// ===== AHP =====
function generateAhpForm() {
    const numCriteria = parseInt(document.getElementById('ahp-criteria').value);
    const container = document.getElementById('ahp-form-container');
    container.innerHTML = '';
    
    // Nombres de criterios
    let html = '<div class="data-table"><h3>Nombres de Criterios</h3><table><thead><tr><th>N°</th><th>Nombre del Criterio</th></tr></thead><tbody>';
    
    for (let i = 0; i < numCriteria; i++) {
        html += `<tr><td>${i + 1}</td><td><input type="text" id="ahp-name-${i}" value="Criterio ${i + 1}"></td></tr>`;
    }
    html += '</tbody></table></div>';
    
    // Matriz de comparaciones
    html += '<div class="data-table"><h3>Matriz de Comparaciones por Pares</h3>';
    html += '<p style="color: #a1a1aa; margin-bottom: 1rem;">Escala: 1=Igual, 3=Moderada, 5=Fuerte, 7=Muy fuerte, 9=Extrema</p>';
    html += '<table><thead><tr><th></th>';
    
    for (let j = 0; j < numCriteria; j++) {
        html += `<th>C${j + 1}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (let i = 0; i < numCriteria; i++) {
        html += `<tr><td><strong>C${i + 1}</strong></td>`;
        for (let j = 0; j < numCriteria; j++) {
            if (i === j) {
                html += '<td>1</td>';
            } else if (i < j) {
                html += `<td><input type="number" step="0.5" min="0.1" id="ahp-comp-${i}-${j}" value="1"></td>`;
            } else {
                html += '<td>-</td>';
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    
    html += '<button class="btn-calculate" onclick="calculateAHP()">Calcular AHP</button>';
    
    container.innerHTML = html;
}

function calculateAHP() {
    const numCriteria = parseInt(document.getElementById('ahp-criteria').value);
    
    // Recopilar nombres
    const names = [];
    for (let i = 0; i < numCriteria; i++) {
        names.push(document.getElementById(`ahp-name-${i}`).value);
    }
    
    // Construir matriz completa
    const matrix = [];
    for (let i = 0; i < numCriteria; i++) {
        matrix[i] = [];
        for (let j = 0; j < numCriteria; j++) {
            if (i === j) {
                matrix[i][j] = 1;
            } else if (i < j) {
                matrix[i][j] = parseFloat(document.getElementById(`ahp-comp-${i}-${j}`).value);
            } else {
                matrix[i][j] = 1 / matrix[j][i];
            }
        }
    }
    
    // Ejecutar AHP
    const ahp = new AHP(matrix, names);
    const result = ahp.calculate();
    
    // Mostrar resultados
    displayAHPResults(result);
}

class AHP {
    constructor(matrix, names) {
        this.matrix = matrix;
        this.names = names;
        this.n = matrix.length;
    }
    
    calculateWeights() {
        // Método del promedio normalizado
        const columnSums = [];
        
        // Sumar cada columna
        for (let j = 0; j < this.n; j++) {
            let sum = 0;
            for (let i = 0; i < this.n; i++) {
                sum += this.matrix[i][j];
            }
            columnSums[j] = sum;
        }
        
        // Normalizar y promediar
        const weights = [];
        for (let i = 0; i < this.n; i++) {
            let rowSum = 0;
            for (let j = 0; j < this.n; j++) {
                rowSum += this.matrix[i][j] / columnSums[j];
            }
            weights[i] = rowSum / this.n;
        }
        
        return weights;
    }
    
    calculateConsistency() {
        const weights = this.calculateWeights();
        
        // Calcular λmax
        const weightedSums = [];
        for (let i = 0; i < this.n; i++) {
            let sum = 0;
            for (let j = 0; j < this.n; j++) {
                sum += this.matrix[i][j] * weights[j];
            }
            weightedSums[i] = sum;
        }
        
        let lambdaMax = 0;
        for (let i = 0; i < this.n; i++) {
            lambdaMax += weightedSums[i] / weights[i];
        }
        lambdaMax /= this.n;
        
        // Calcular CI y CR
        const CI = (lambdaMax - this.n) / (this.n - 1);
        
        // Índices aleatorios
        const RI = [0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
        const CR = CI / RI[this.n - 1];
        
        return { CI, CR, lambdaMax };
    }
    
    calculate() {
        const weights = this.calculateWeights();
        const consistency = this.calculateConsistency();
        
        const ranking = weights.map((weight, index) => ({
            criterion: this.names[index],
            weight: weight
        })).sort((a, b) => b.weight - a.weight);
        
        return {
            ranking,
            consistency
        };
    }
}

// ===== SISTEMA INTEGRADO =====
function generateIntegratedForm() {
    const numAlternatives = parseInt(document.getElementById('int-alternatives').value);
    const numCriteria = parseInt(document.getElementById('int-criteria').value);
    
    const container = document.getElementById('integrated-form-container');
    container.innerHTML = '';
    
    // Nombres de criterios
    let html = '<div class="data-table"><h3>Paso 1: Nombres de Criterios</h3><table><thead><tr><th>N°</th><th>Nombre</th><th>Tipo</th></tr></thead><tbody>';
    
    for (let i = 0; i < numCriteria; i++) {
        html += `<tr><td>${i + 1}</td>`;
        html += `<td><input type="text" id="int-crit-name-${i}" value="Criterio ${i + 1}"></td>`;
        html += `<td><select id="int-crit-type-${i}"><option value="beneficio">Beneficio</option><option value="costo">Costo</option></select></td>`;
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    
    // Matriz AHP
    html += '<div class="data-table"><h3>Paso 2: Comparaciones AHP (para calcular pesos)</h3><table><thead><tr><th></th>';
    
    for (let j = 0; j < numCriteria; j++) {
        html += `<th>C${j + 1}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (let i = 0; i < numCriteria; i++) {
        html += `<tr><td><strong>C${i + 1}</strong></td>`;
        for (let j = 0; j < numCriteria; j++) {
            if (i === j) {
                html += '<td>1</td>';
            } else if (i < j) {
                html += `<td><input type="number" step="0.5" id="int-ahp-${i}-${j}" value="1"></td>`;
            } else {
                html += '<td>-</td>';
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    
    // Matriz TOPSIS
    html += '<div class="data-table"><h3>Paso 3: Valores de Alternativas (para TOPSIS)</h3><table><thead><tr><th>Alternativa</th>';
    
    for (let j = 0; j < numCriteria; j++) {
        html += `<th>C${j + 1}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (let i = 0; i < numAlternatives; i++) {
        html += `<tr><td>Alternativa ${i + 1}</td>`;
        for (let j = 0; j < numCriteria; j++) {
            html += `<td><input type="number" step="0.01" id="int-val-${i}-${j}" value="0"></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    
    html += '<button class="btn-calculate" onclick="calculateIntegrated()">Calcular Sistema Integrado</button>';
    
    container.innerHTML = html;
}

function calculateIntegrated() {
    const numAlternatives = parseInt(document.getElementById('int-alternatives').value);
    const numCriteria = parseInt(document.getElementById('int-criteria').value);
    
    // Nombres y tipos
    const criteriaNames = [];
    const criteriaTypes = [];
    for (let i = 0; i < numCriteria; i++) {
        criteriaNames.push(document.getElementById(`int-crit-name-${i}`).value);
        criteriaTypes.push(document.getElementById(`int-crit-type-${i}`).value);
    }
    
    // Matriz AHP
    const ahpMatrix = [];
    for (let i = 0; i < numCriteria; i++) {
        ahpMatrix[i] = [];
        for (let j = 0; j < numCriteria; j++) {
            if (i === j) {
                ahpMatrix[i][j] = 1;
            } else if (i < j) {
                ahpMatrix[i][j] = parseFloat(document.getElementById(`int-ahp-${i}-${j}`).value);
            } else {
                ahpMatrix[i][j] = 1 / ahpMatrix[j][i];
            }
        }
    }
    
    // Calcular pesos con AHP
    const ahp = new AHP(ahpMatrix, criteriaNames);
    const ahpResult = ahp.calculate();
    const weights = ahpResult.ranking.sort((a, b) => {
        const indexA = criteriaNames.indexOf(a.criterion);
        const indexB = criteriaNames.indexOf(b.criterion);
        return indexA - indexB;
    }).map(r => r.weight);
    
    // Matriz de valores para TOPSIS
    const topsisMatrix = [];
    for (let i = 0; i < numAlternatives; i++) {
        const row = [];
        for (let j = 0; j < numCriteria; j++) {
            row.push(parseFloat(document.getElementById(`int-val-${i}-${j}`).value));
        }
        topsisMatrix.push(row);
    }
    
    // Calcular ranking con TOPSIS
    const topsis = new TOPSIS(topsisMatrix, weights, criteriaTypes);
    const topsisResult = topsis.calculate();
    
    // Mostrar resultados integrados
    displayIntegratedResults(ahpResult, topsisResult, criteriaNames, weights);
}

// ===== VISUALIZACIÓN DE RESULTADOS =====
function displayResults(method, ranking) {
    const resultsSection = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    
    let html = `<div class="result-card">
        <h3>Método: ${method}</h3>
        <div class="ranking-list">`;
    
    ranking.forEach((item, index) => {
        html += `<div class="ranking-item">
            <div class="ranking-position">#${index + 1}</div>
            <div class="ranking-name">${item.alternative}</div>
            <div class="ranking-score">${item.score.toFixed(4)}</div>
        </div>`;
    });
    
    html += '</div></div>';
    
    resultsContent.innerHTML = html;
    resultsSection.style.display = 'block';
    
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function displayAHPResults(result) {
    const resultsSection = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    
    let html = `<div class="result-card">
        <h3>Resultados AHP - Pesos de Criterios</h3>
        <div class="ranking-list">`;
    
    result.ranking.forEach((item, index) => {
        html += `<div class="ranking-item">
            <div class="ranking-position">#${index + 1}</div>
            <div class="ranking-name">${item.criterion}</div>
            <div class="ranking-score">${(item.weight * 100).toFixed(2)}%</div>
        </div>`;
    });
    
    html += '</div></div>';
    
    // Consistencia
    const crColor = result.consistency.CR < 0.1 ? '#10b981' : '#ef4444';
    const crStatus = result.consistency.CR < 0.1 ? 'Aceptable' : 'No Aceptable';
    
    html += `<div class="result-card">
        <h3>Análisis de Consistencia</h3>
        <table>
            <tr><td>λmax:</td><td>${result.consistency.lambdaMax.toFixed(4)}</td></tr>
            <tr><td>Índice de Consistencia (CI):</td><td>${result.consistency.CI.toFixed(4)}</td></tr>
            <tr><td>Ratio de Consistencia (CR):</td><td style="color: ${crColor}; font-weight: bold;">${result.consistency.CR.toFixed(4)} (${crStatus})</td></tr>
        </table>
    </div>`;
    
    resultsContent.innerHTML = html;
    resultsSection.style.display = 'block';
    
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function displayIntegratedResults(ahpResult, topsisResult, criteriaNames, weights) {
    const resultsSection = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    
    let html = `<div class="result-card">
        <h3>Fase 1: Pesos AHP</h3>
        <table>
            <thead><tr><th>Criterio</th><th>Peso</th></tr></thead>
            <tbody>`;
    
    criteriaNames.forEach((name, index) => {
        html += `<tr><td>${name}</td><td>${(weights[index] * 100).toFixed(2)}%</td></tr>`;
    });
    
    html += '</tbody></table></div>';
    
    // Consistencia AHP
    const crColor = ahpResult.consistency.CR < 0.1 ? '#10b981' : '#ef4444';
    const crStatus = ahpResult.consistency.CR < 0.1 ? 'Aceptable' : 'No Aceptable';
    
    html += `<div class="result-card">
        <h3>Consistencia AHP</h3>
        <p style="color: ${crColor}; font-weight: bold;">CR = ${ahpResult.consistency.CR.toFixed(4)} (${crStatus})</p>
    </div>`;
    
    // Ranking TOPSIS
    html += `<div class="result-card">
        <h3>Fase 2: Ranking Final TOPSIS</h3>
        <div class="ranking-list">`;
    
    topsisResult.forEach((item, index) => {
        html += `<div class="ranking-item">
            <div class="ranking-position">#${index + 1}</div>
            <div class="ranking-name">${item.alternative}</div>
            <div class="ranking-score">${item.score.toFixed(4)}</div>
        </div>`;
    });
    
    html += '</div></div>';
    
    resultsContent.innerHTML = html;
    resultsSection.style.display = 'block';
    
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}
