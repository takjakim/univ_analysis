import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Download, Search, Filter, X, Database } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const UniversalCSVAnalyzer = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [config, setConfig] = useState({
    entityColumn: '',
    yearColumn: '',
    regionColumn: '',
    analysisColumns: []
  });

  // 필터링된 엔티티 목록
  const filteredEntities = useMemo(() => {
    if (!searchTerm) return [];
    return entities.filter(entity => 
      entity.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entities, searchTerm]);

  // T점수 클래스 반환 함수
  const getTScoreClass = (score) => {
    if (score >= 60) return 'text-green-600';
    if (score >= 50) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // 엔티티 추가 함수
  const addEntity = (entity) => {
    if (!selectedEntities.includes(entity)) {
      setSelectedEntities([...selectedEntities, entity]);
    }
    setSearchTerm('');
  };

  // 쉼표로 구분된 엔티티 추가 함수
  const addEntitiesFromComma = (input) => {
    const entities = input.split(',').map(e => e.trim()).filter(e => e);
    const newEntities = entities.filter(entity => !selectedEntities.includes(entity));
    if (newEntities.length > 0) {
      setSelectedEntities([...selectedEntities, ...newEntities]);
    }
    setSearchTerm('');
  };

  // 엔티티 제거 함수
  const removeEntity = (entity) => {
    setSelectedEntities(selectedEntities.filter(e => e !== entity));
  };

  // CSV 파일 처리 함수
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const parsedData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      setData(parsedData);
      setColumns(headers);
      
      // 컬럼 자동 감지 및 설정
      const entityColumn = headers.find(h => 
        h.includes('학교') || h.includes('기관') || h.includes('대상') || h.includes('명')
      ) || headers[0];
      
      const yearColumn = headers.find(h => 
        h.includes('연도') || h.includes('년도') || h.includes('년') || h.includes('기준연도')
      );
      
      setConfig(prev => ({
        ...prev,
        entityColumn: entityColumn,
        yearColumn: yearColumn || ''
      }));
    };
    reader.readAsText(file);
  };

  // 엔티티 목록 업데이트
  useEffect(() => {
    if (config.entityColumn && data.length > 0) {
      const uniqueEntities = [...new Set(data.map(row => row[config.entityColumn]))];
      setEntities(uniqueEntities.filter(entity => entity && entity.trim()));
    }
  }, [data, config.entityColumn]);

  // 데이터 분석 함수
  const analyzeData = () => {
    if (selectedEntities.length === 0 || config.analysisColumns.length === 0) return;

    const baseEntity = selectedEntities[0];
    const years = [...new Set(data.map(row => row[config.yearColumn]))].filter(year => year).sort();
    
    // 엔티티별 통계 계산
    const entityStats = selectedEntities.map(entity => {
      const entityData = data.filter(row => row[config.entityColumn] === entity);
      const yearlyData = {};
      const averages = {};
      
      config.analysisColumns.forEach(column => {
        yearlyData[column] = {};
        const values = [];
        
        years.forEach(year => {
          const yearData = entityData.filter(row => row[config.yearColumn] === year);
          const sum = yearData.reduce((acc, row) => acc + (parseFloat(row[column]) || 0), 0);
          const avg = yearData.length > 0 ? sum / yearData.length : 0;
          yearlyData[column][year] = avg;
          if (avg > 0) values.push(avg);
        });
        
        averages[column] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      });
      
      return { entity, yearlyData, averages };
    });

    // T점수 계산
    const tScores = {};
    selectedEntities.forEach(entity => {
      const entityStat = entityStats.find(stat => stat.entity === entity);
      if (!entityStat) return;
      
      const tScoresForEntity = {};
      let totalTScore = 0;
      let validColumns = 0;
      
      config.analysisColumns.forEach(column => {
        const baseAvg = entityStats.find(stat => stat.entity === baseEntity)?.averages[column] || 0;
        const entityAvg = entityStat.averages[column] || 0;
        
        if (baseAvg > 0) {
          const tScore = 50 + ((entityAvg - baseAvg) / baseAvg) * 50;
          tScoresForEntity[column] = Math.max(0, Math.min(100, tScore));
          totalTScore += tScoresForEntity[column];
          validColumns++;
        } else {
          tScoresForEntity[column] = 50;
        }
      });
      
      tScores[entity] = {
        entity,
        tScores: tScoresForEntity,
        avgTScore: validColumns > 0 ? totalTScore / validColumns : 50
      };
    });

    // 연도별 데이터 준비
    const yearlyData = years.map(year => {
      const yearData = { year };
      selectedEntities.forEach(entity => {
        config.analysisColumns.forEach(column => {
          const entityStat = entityStats.find(stat => stat.entity === entity);
          if (entityStat) {
            yearData[entity + '_' + column] = entityStat.yearlyData[column][year] || 0;
          }
        });
      });
      return yearData;
    });

    // 평균 통계 계산 (지역 컬럼이 있는 경우)
    let averageStats = null;
    if (config.regionColumn) {
      const regionData = data.filter(row => row[config.regionColumn] && 
        (row[config.regionColumn].includes('서울') || row[config.regionColumn].includes('경기') || 
         row[config.regionColumn].includes('인천') || row[config.regionColumn].includes('수도권')));
      
      if (regionData.length > 0) {
        const 수도권평균 = calculateAverageStats(regionData, years);
        const 전국평균 = calculateAverageStats(data, years);
        averageStats = { 수도권평균, 전국평균 };
      }
    }

    setAnalysisResults({
      baseEntity,
      columns: config.analysisColumns,
      years,
      entityStats,
      tScores,
      yearlyData,
      averageStats
    });
  };

  // 평균 통계 계산 함수
  const calculateAverageStats = (data, years) => {
    const yearlyData = {};
    const averages = {};
    
    config.analysisColumns.forEach(column => {
      yearlyData[column] = {};
      const values = [];
      
      years.forEach(year => {
        const yearData = data.filter(row => row[config.yearColumn] === year);
        const sum = yearData.reduce((acc, row) => acc + (parseFloat(row[column]) || 0), 0);
        const avg = yearData.length > 0 ? sum / yearData.length : 0;
        yearlyData[column][year] = avg;
        if (avg > 0) values.push(avg);
      });
      
      averages[column] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });
    
    return { yearlyData, averages };
  };

  // CSV 다운로드 헬퍼 함수
  const downloadCSV = (content, filename) => {
    // BOM 추가로 한글 깨짐 방지
    const BOM = '\uFEFF';
    const csvContent = BOM + content;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // T점수 CSV 생성
  const createTScoreCSV = () => {
    const csvContent = [
      ['대상명', ...analysisResults.columns, '종합 T점수'],
      ...Object.values(analysisResults.tScores)
        .sort((a, b) => b.avgTScore - a.avgTScore)
        .map(tScore => [
          tScore.entity,
          ...analysisResults.columns.map(col => (tScore.tScores[col] || 50).toFixed(1)),
          tScore.avgTScore.toFixed(1)
        ])
    ].map(row => row.join(',')).join('\n');
    
    return csvContent;
  };

  // 연도별 데이터 CSV 생성
  const createYearlyDataCSV = (column) => {
    const csvContent = [
      ['대상명', ...analysisResults.years, '평균'],
      ...analysisResults.entityStats
        .sort((a, b) => (b.averages[column] || 0) - (a.averages[column] || 0))
        .map(stat => [
          stat.entity,
          ...analysisResults.years.map(year => (stat.yearlyData[column][year] || 0).toFixed(1)),
          (stat.averages[column] || 0).toFixed(1)
        ]),
      ...(analysisResults.averageStats ? [
        [''],
        ['🏙️ 수도권평균', ...analysisResults.years.map(year => 
          (analysisResults.averageStats.수도권평균.yearlyData[column][year] || 0).toFixed(1)
        ), (analysisResults.averageStats.수도권평균.averages[column] || 0).toFixed(1)],
        ['🇰🇷 전국평균', ...analysisResults.years.map(year => 
          (analysisResults.averageStats.전국평균.yearlyData[column][year] || 0).toFixed(1)
        ), (analysisResults.averageStats.전국평균.averages[column] || 0).toFixed(1)]
      ] : [])
    ].map(row => row.join(',')).join('\n');
    
    return csvContent;
  };

  // 모든 데이터를 하나의 ZIP 파일로 다운로드
  const exportAllResults = () => {
    if (!analysisResults) return;
    
    // T점수 데이터 다운로드
    const tScoreCSV = createTScoreCSV();
    downloadCSV(tScoreCSV, `T점수_분석_${analysisResults.baseEntity}.csv`);
    
    // 각 컬럼별 연도 데이터 다운로드
    analysisResults.columns.forEach(column => {
      const yearlyCSV = createYearlyDataCSV(column);
      downloadCSV(yearlyCSV, `${column}_연도별_분석.csv`);
    });
  };

  // 기존 단일 T점수 다운로드 함수 (하위 호환성)
  const exportResults = () => {
    if (!analysisResults) return;
    const tScoreCSV = createTScoreCSV();
    downloadCSV(tScoreCSV, `T점수_분석_${analysisResults.baseEntity}.csv`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📊 Universal CSV Analyzer
          </h1>
          <p className="text-gray-600 text-lg">
            CSV 데이터를 업로드하고 T점수 기반 비교 분석을 수행하세요
          </p>
        </header>

        {data.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">CSV 파일을 업로드하세요</h2>
              <p className="text-gray-500 mb-6">
                분석할 CSV 파일을 선택하면 자동으로 컬럼을 감지하고 설정할 수 있습니다.
              </p>
            </div>
            <label className="cursor-pointer inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium shadow-lg transition-all">
              <Upload className="h-5 w-5 mr-2" />
              📁 CSV 파일 선택
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <>
            <div className="mb-6 p-6 bg-white rounded-xl shadow-lg border">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">⚙️ 분석 설정</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">👥 분석 대상 컬럼</label>
                  <select
                    value={config.entityColumn}
                    onChange={(e) => setConfig({...config, entityColumn: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">선택하세요</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">📅 연도 컬럼</label>
                  <select
                    value={config.yearColumn}
                    onChange={(e) => setConfig({...config, yearColumn: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">선택하세요</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">🗺️ 지역 컬럼 (수도권 평균용)</label>
                  <select
                    value={config.regionColumn}
                    onChange={(e) => setConfig({...config, regionColumn: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">없음</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-700">📊 분석할 데이터 컬럼들</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {columns.map(col => (
                      <label key={col} className="flex items-center space-x-2 p-2 rounded border hover:bg-blue-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.analysisColumns.includes(col)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig({...config, analysisColumns: [...config.analysisColumns, col]});
                            } else {
                              setConfig({...config, analysisColumns: config.analysisColumns.filter(c => c !== col)});
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{col}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">📈 데이터 정보</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">총 행 수:</span>
                  <span className="font-semibold text-blue-700">{data.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">컬럼 수:</span>
                  <span className="font-semibold text-blue-700">{columns.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">분석 대상 수:</span>
                  <span className="font-semibold text-blue-700">{entities.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">선택된 분석 컬럼:</span>
                  <span className="font-semibold text-blue-700">{config.analysisColumns.length}</span>
                </div>
              </div>
            </div>

            {config.entityColumn && (
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`🔍 ${config.entityColumn}을(를) 검색하거나 쉼표(,)로 구분해서 입력하세요...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && searchTerm.includes(',')) {
                        addEntitiesFromComma(searchTerm);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>
                
                {searchTerm && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                    {searchTerm.includes(',') ? (
                      <div className="p-4">
                        <div className="text-sm text-gray-600 mb-2">
                          쉼표로 구분된 입력을 Enter 키로 추가할 수 있습니다:
                        </div>
                        <div className="text-sm text-gray-800 mb-3">
                          {searchTerm.split(',').map((entity, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 mb-1">
                              {entity.trim() || '빈 값'}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => addEntitiesFromComma(searchTerm)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          ✅ 선택된 항목들 추가
                        </button>
                      </div>
                    ) : (
                      <>
                        {filteredEntities.slice(0, 15).map(entity => (
                          <button
                            key={entity}
                            onClick={() => addEntity(entity)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <span className="text-gray-800">{entity}</span>
                          </button>
                        ))}
                        {filteredEntities.length > 15 && (
                          <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
                            +{filteredEntities.length - 15}개 더 있음
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">
                ✅ 선택된 분석 대상 ({selectedEntities.length}개)
              </h2>
              <div className="flex flex-wrap gap-2">
                {selectedEntities.map((entity, index) => (
                  <span
                    key={entity}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm border border-green-200"
                  >
                    {index === 0 && <span className="mr-1">👑</span>}
                    {entity}
                    <button
                      onClick={() => removeEntity(entity)}
                      className="ml-2 text-green-600 hover:text-green-800 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedEntities.length === 0 && (
                  <div className="text-gray-500 italic">분석할 대상을 검색해서 추가하세요</div>
                )}
              </div>
              {selectedEntities.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  💡 첫 번째 선택된 대상 <strong>{selectedEntities[0]}</strong>이 T점수 기준(50점)이 됩니다.
                </div>
              )}
            </div>

            <div className="mb-8">
              <button
                onClick={analyzeData}
                disabled={selectedEntities.length === 0 || config.analysisColumns.length === 0}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center gap-3 text-lg font-medium shadow-lg transition-all"
              >
                <Filter className="h-5 w-5" />
                🚀 분석 실행
              </button>
            </div>

            {analysisResults && (
              <div className="space-y-8">
                              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-semibold text-gray-800">📊 분석 결과</h2>
                <div className="flex gap-3">
                  <button
                    onClick={exportResults}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 font-medium shadow-lg transition-all"
                  >
                    <Download className="h-4 w-4" />
                    📊 T점수만 다운로드
                  </button>
                  <button
                    onClick={exportAllResults}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 flex items-center gap-2 font-medium shadow-lg transition-all"
                  >
                    <Download className="h-4 w-4" />
                    💾 모든 데이터 다운로드
                  </button>
                </div>
              </div>

                {analysisResults.tScores && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200 shadow-lg">
                    <h3 className="text-2xl font-semibold mb-4 text-purple-800">
                      🎯 T점수 분석 (기준: {analysisResults.baseEntity})
                    </h3>
                    <div className="mb-4 text-sm text-purple-700 bg-purple-100 p-4 rounded-lg">
                      <strong>📈 T점수 해석:</strong> 기준 대상({analysisResults.baseEntity})을 50점으로 하여 상대적 성과를 표준화한 점수입니다. 
                      50점 초과는 기준보다 우수, 50점 미만은 기준보다 미흡을 의미합니다.
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-purple-300 analysis-table">
                        <thead>
                          <tr className="bg-purple-100">
                            <th className="border border-purple-300 px-4 py-3 text-left font-semibold">대상명</th>
                            {analysisResults.columns.map(column => (
                              <th key={column} className="border border-purple-300 px-4 py-3 text-center font-semibold">
                                {column}
                              </th>
                            ))}
                            <th className="border border-purple-300 px-4 py-3 text-center font-semibold">🏆 종합 T점수</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(analysisResults.tScores)
                            .sort((a, b) => b.avgTScore - a.avgTScore)
                            .map((tScore, index) => (
                            <tr key={tScore.entity} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-25'}>
                              <td className="border border-purple-300 px-4 py-3 font-medium">
                                {index < 3 && <span className="mr-2">{['🥇', '🥈', '🥉'][index]}</span>}
                                {tScore.entity}
                                {tScore.entity === analysisResults.baseEntity && (
                                  <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">기준</span>
                                )}
                              </td>
                              {analysisResults.columns.map(column => (
                                <td key={column} className="border border-purple-300 px-4 py-3 text-center">
                                  <span className={`font-medium ${getTScoreClass(tScore.tScores[column] || 50)}`}>
                                    {(tScore.tScores[column] || 50).toFixed(1)}
                                  </span>
                                </td>
                              ))}
                              <td className="border border-purple-300 px-4 py-3 text-center">
                                <span className={`font-bold text-lg ${getTScoreClass(tScore.avgTScore)}`}>
                                  {tScore.avgTScore.toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center gap-2 p-2 bg-green-100 rounded">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="font-medium">60+ : 매우 우수</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-blue-100 rounded">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="font-medium">50-59 : 우수</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-orange-100 rounded">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="font-medium">40-49 : 보통</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-red-100 rounded">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="font-medium">40 미만 : 개선 필요</span>
                      </div>
                    </div>
                  </div>
                )}

                {analysisResults.columns.map(column => (
                  <div key={column} className="bg-gray-50 p-6 rounded-xl border shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">📈 {column} 분석</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 analysis-table">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-3 text-left font-semibold">대상명</th>
                            {analysisResults.years.map(year => (
                              <th key={year} className="border border-gray-300 px-4 py-3 text-center font-semibold">
                                {year}
                              </th>
                            ))}
                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold">📊 평균</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisResults.entityStats
                            .sort((a, b) => (b.averages[column] || 0) - (a.averages[column] || 0))
                            .map((stat, index) => (
                            <tr key={stat.entity} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-3 font-medium">
                                {index < 3 && <span className="mr-2">{['🥇', '🥈', '🥉'][index]}</span>}
                                {stat.entity}
                              </td>
                              {analysisResults.years.map(year => (
                                <td key={year} className="border border-gray-300 px-4 py-3 text-center">
                                  {(stat.yearlyData[column][year] || 0) > 0 ? 
                                    <span className="font-medium">{(stat.yearlyData[column][year] || 0).toFixed(1)}</span> : 
                                    <span className="text-gray-400">-</span>
                                  }
                                </td>
                              ))}
                              <td className="border border-gray-300 px-4 py-3 text-center">
                                <span className="font-bold text-blue-600">
                                  {(stat.averages[column] || 0).toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                          
                          {analysisResults.averageStats && (
                            <>
                              <tr>
                                <td colSpan={analysisResults.years.length + 2} className="border-t-2 border-blue-500 p-0"></td>
                              </tr>
                              <tr className="bg-blue-50">
                                <td className="border border-gray-300 px-4 py-3 font-bold text-blue-700">🏙️ 수도권평균</td>
                                {analysisResults.years.map(year => (
                                  <td key={year} className="border border-gray-300 px-4 py-3 text-center text-blue-700 font-medium">
                                    {(analysisResults.averageStats.수도권평균.yearlyData[column][year] || 0).toFixed(1)}
                                  </td>
                                ))}
                                <td className="border border-gray-300 px-4 py-3 text-center font-bold text-blue-700">
                                  {(analysisResults.averageStats.수도권평균.averages[column] || 0).toFixed(1)}
                                </td>
                              </tr>
                              <tr className="bg-green-50">
                                <td className="border border-gray-300 px-4 py-3 font-bold text-green-700">🇰🇷 전국평균</td>
                                {analysisResults.years.map(year => (
                                  <td key={year} className="border border-gray-300 px-4 py-3 text-center text-green-700 font-medium">
                                    {(analysisResults.averageStats.전국평균.yearlyData[column][year] || 0).toFixed(1)}
                                  </td>
                                ))}
                                <td className="border border-gray-300 px-4 py-3 text-center font-bold text-green-700">
                                  {(analysisResults.averageStats.전국평균.averages[column] || 0).toFixed(1)}
                                </td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {analysisResults.tScores && (
                  <div className="bg-white p-6 border rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">📊 종합 T점수 비교</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={Object.values(analysisResults.tScores).sort((a, b) => b.avgTScore - a.avgTScore)}
                        margin={{ left: 50, right: 20, top: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="entity" 
                          angle={-45} 
                          textAnchor="end" 
                          height={120}
                          interval={0}
                          fontSize={12}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value) => [value.toFixed(1) + '점', 'T점수']}
                          labelFormatter={(label) => '대상: ' + label}
                        />
                        <Bar dataKey="avgTScore" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {analysisResults.years.length > 1 && analysisResults.columns.map(column => (
                  <div key={column} className="bg-white p-6 border rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">📈 {column} 트렌드</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={analysisResults.yearlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {selectedEntities.map((entity, index) => (
                          <Line
                            key={entity}
                            type="monotone"
                            dataKey={entity + '_' + column}
                            stroke={'hsl(' + (index * 45) + ', 70%, 50%)'}
                            strokeWidth={3}
                            name={entity}
                            dot={{ r: 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>🔒 모든 데이터는 브라우저에서만 처리되며 서버로 전송되지 않습니다.</p>
        </footer>
      </div>
    </div>
  );
};

export default UniversalCSVAnalyzer;
