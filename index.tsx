import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// Base clicks for different grinders and brewing methods, calibrated with expert recommendations.
// Values are now ranges [min, max] for more realistic guidance.
const GRINDERS = {
  'Gadnic C10': { 
    Espresso: [8, 12], 
    'Moka Italiana': [12, 16], 
    Aeropress: [15, 20], 
    V60: [18, 24], 
    Chemex: [24, 30], 
    'Prensa Francesa': [28, 34] 
  },
  'Comandante C40': { 
    Espresso: [6, 10], 
    'Moka Italiana': [11, 15], 
    Aeropress: [16, 22], 
    V60: [23, 28], 
    Chemex: [28, 34], 
    'Prensa Francesa': [35, 40] 
  },
  'Timemore C2': { 
    Espresso: [8, 12], 
    'Moka Italiana': [12, 15], 
    Aeropress: [14, 17], 
    V60: [17, 24], 
    Chemex: [24, 28], 
    'Prensa Francesa': [27, 32] 
  },
};

const BREW_METHODS_CONFIG = {
  'Espresso': { type: 'dose', ratio: 2, defaultDose: 18, description: 'Ratio típico 1:2 (café:agua)' },
  'V60': { type: 'water', ratio: 16, defaultWater: 250, description: 'Ratio recomendado 1:16' },
  'Aeropress': { type: 'water', ratio: 15, defaultWater: 240, description: 'Ratio recomendado 1:15' },
  'Chemex': { type: 'water', ratio: 16, defaultWater: 500, description: 'Ratio recomendado 1:16' },
  'Prensa Francesa': { type: 'water', ratio: 15, defaultWater: 350, description: 'Ratio recomendado 1:15' },
  'Moka Italiana': {
    type: 'moka',
    sizes: { '1 Taza (~50ml)': { dose: 6, water: 50 }, '3 Tazas (~150ml)': { dose: 15, water: 150 }, '6 Tazas (~300ml)': { dose: 25, water: 300 } },
    defaultSize: '3 Tazas (~150ml)',
    description: 'Llenar el filtro sin presionar y el agua hasta la válvula.'
  }
} as const;

type Grinder = keyof typeof GRINDERS;
type BrewMethod = keyof typeof BREW_METHODS_CONFIG;

type TastingResult = 'Equilibrado' | 'Ácido' | 'Amargo';

type Preset = {
  id: string;
  name: string;
  brewMethod: BrewMethod;
  selectedGrinder: Grinder;
  temperature: number;
  humidity: number;
  coffeeDose: number;
  waterAmount: number;
  mokaSize: string;
  notes: string;
  tastingNotes?: TastingResult;
};

const TASTING_RECOMMENDATIONS = {
    'Ácido': 'Un sabor ácido o agrio suele indicar sub-extracción. Prueba con una molienda más fina, aumenta la temperatura del agua o el tiempo de extracción.',
    'Amargo': 'Un sabor amargo o astringente suele indicar sobre-extracción. Prueba con una molienda más gruesa, disminuye la temperatura del agua o el tiempo de extracción.',
    'Equilibrado': '¡Felicidades! Lograste una extracción balanceada y deliciosa.'
};


// --- VIEWS ---

const ProportionsGuideModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Proporciones de Preparaciones</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">&times;</button>
        </header>
        <div className="modal-body">
          <section>
            <h3>CAFÉ SOLO</h3>
            <ul>
              <li><strong>Espresso / Lungo</strong><span>20 g de café → 40 g (espresso) o 60 g (lungo)</span></li>
              <li><strong>Doppio / Doppio Lungo</strong><span>40 g de café → 80 g (doppio) o 100+ g (lungo doppio)</span></li>
              <li><strong>Ristretto</strong><span>20 g de café → 20–25 g de bebida</span></li>
              <li><strong>Long Black (Americano)</strong><span>2 shots de espresso + 100–120 ml de agua caliente</span></li>
              <li><strong>Filtrado</strong><span>1:15 a 1:17 (Ej: 20 g de café → 300–340 g de agua)</span></li>
              <li><strong>Batch Brew</strong><span>Igual que el filtrado pero preparado en lotes</span></li>
            </ul>
          </section>
          <section>
            <h3>CAFÉ FRESCO</h3>
            <ul>
              <li><strong>Cold Brew</strong><span>1:8 a 1:10 (Ej: 100 g de café → 800–1000 g de agua fría, reposado 12–18 h)</span></li>
              <li><strong>Lemon Cold Brew</strong><span>Hielo picado + 2 cdas de sirope de limón + 40 ml de espresso cold brew + agua con gas + cáscaras de limón</span></li>
              <li><strong>Flat White Frío</strong><span>Espresso + 100 ml de leche fría texturizada</span></li>
              <li><strong>Latte Frío</strong><span>Espresso + 150–180 ml de leche fría</span></li>
              <li><strong>Magic Frío</strong><span>60 ml de ristretto + 150 ml de leche al vapor</span></li>
              <li><strong>Hoppy Espresso</strong><span>Espresso + soda lupulada fría</span></li>
            </ul>
          </section>
          <section>
            <h3>CAFÉ CON LECHE</h3>
            <ul>
              <li><strong>Macchiato</strong><span>Espresso + una cucharada de espuma de leche</span></li>
              <li><strong>Magic</strong><span>60 ml de ristretto + 150 ml de leche al vapor</span></li>
              <li><strong>Cappu</strong><span>Espresso + 80 ml de leche + 80 ml de espuma (proporción 1:1:1)</span></li>
              <li><strong>Latte</strong><span>Espresso + 150–200 ml de leche con poca espuma</span></li>
              <li><strong>Flat White</strong><span>Espresso + 120 ml de leche texturizada (menos espuma que un cappuccino)</span></li>
              <li><strong>Mocaccino</strong><span>Espresso + 120 ml de leche + 20-30 g de chocolate o sirope</span></li>
              <li><strong>Vainilla Latte</strong><span>Espresso + 150–200 ml de leche + 10–20 ml de jarabe de vainilla</span></li>
            </ul>
          </section>
          <section>
            <h3>Datos Útiles</h3>
            <ul>
              <li><strong>Espresso clásico</strong><span>20 g de café → 40 g de bebida</span></li>
              <li><strong>Ristretto</strong><span>20 g de café → 20–25 g de bebida</span></li>
              <li><strong>Lungo</strong><span>20 g de café → 50–60 g de bebida</span></li>
              <li><strong>Americano</strong><span>2 shots de espresso + agua caliente a gusto</span></li>
              <li><strong>Filtrado</strong><span>Relación 1:15 a 1:17</span></li>
              <li><strong>Cold Brew</strong><span>Infusión en frío por 12–18 h, 1:8 o 1:10</span></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

const MainMenu = ({ presets, onSelectPreset, onAddNewPreset, onDeletePreset, onOpenGuide }: {
  presets: Preset[],
  onSelectPreset: (id: string) => void,
  onAddNewPreset: (method: BrewMethod) => void,
  onDeletePreset: (id: string, name: string) => void,
  onOpenGuide: () => void,
}) => {
  const presetsByCategory = useMemo(() => {
    const categories: Record<string, Preset[]> = {};
    for (const method of Object.keys(BREW_METHODS_CONFIG)) {
      categories[method] = [];
    }
    presets.forEach(p => {
      if (categories[p.brewMethod]) {
        categories[p.brewMethod].push(p);
      }
    });
    return categories;
  }, [presets]);

  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    const initiallyOpen = new Set<string>();
    Object.entries(presetsByCategory).forEach(([category, items]) => {
        if (items.length > 0) {
            initiallyOpen.add(category);
        }
    });
    return initiallyOpen;
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(currentOpen => {
        const newOpen = new Set(currentOpen);
        if (newOpen.has(category)) {
            newOpen.delete(category);
        } else {
            newOpen.add(category);
        }
        return newOpen;
    });
  };

  return (
    <div className="main-menu-container">
       <header className="main-menu-header">
          <h1>Guia de Cafe</h1>
        </header>
        <main>
          {Object.entries(presetsByCategory).map(([category, items]) => (
            <div key={category} className="brew-category">
                <div 
                    className={`category-header ${openCategories.has(category) ? 'is-open' : ''}`}
                    onClick={() => toggleCategory(category)}
                >
                    <span className="category-title">{category}</span>
                    <button 
                    className="add-item-btn" 
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent accordion from toggling
                        onAddNewPreset(category as BrewMethod);
                    }}
                    aria-label={`Agregar nueva preparación de ${category}`}
                    >
                    +
                    </button>
                </div>

              {openCategories.has(category) && (
                <div className="preset-list">
                  {items.length > 0 ? (
                    items.map(preset => (
                      <div key={preset.id} className="preset-item-container">
                        <button className="preset-item-name" onClick={() => onSelectPreset(preset.id)}>
                          {preset.name}
                        </button>
                        <button 
                          className="delete-preset-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePreset(preset.id, preset.name);
                          }}
                          aria-label={`Eliminar ${preset.name}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="no-presets-in-category">Aún no tienes recetas aquí. ¡Agrega una con el botón (+)!</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </main>
        <footer>
          <button className="guide-button" onClick={onOpenGuide}>Guía de Proporciones</button>
        </footer>
    </div>
  );
};


const CalculatorView = ({ activePreset, updateActivePreset, onBackToMenu, onSave }: {
  activePreset: Preset,
  updateActivePreset: (key: keyof Preset, value: any) => void,
  onBackToMenu: () => void,
  onSave: () => void,
}) => {
  const [clickRange, setClickRange] = useState('');
  const [recommendedClick, setRecommendedClick] = useState(0);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  const activeDose = useMemo(() => {
    const config = BREW_METHODS_CONFIG[activePreset.brewMethod];
    switch (config.type) {
      case 'dose': return activePreset.coffeeDose;
      case 'water': return Math.round((activePreset.waterAmount / config.ratio) * 10) / 10;
      case 'moka': return config.sizes[activePreset.mokaSize as keyof typeof config.sizes].dose;
      default: return 16;
    }
  }, [activePreset]);

  useEffect(() => {
    const { selectedGrinder, brewMethod, temperature, humidity } = activePreset;
    const baseRange = GRINDERS[selectedGrinder][brewMethod];
    if (!baseRange || baseRange.length !== 2) return;
    const [baseMin, baseMax] = baseRange;

    // Adjusted neutral points for the new ranges (-10 to 40 for temp, 0 to 100 for humidity)
    const tempAdjustment = (temperature - 15) * 0.1;
    const humidityAdjustment = (humidity - 50) * 0.07;
    const doseAdjustment = (activeDose - 16) * 0.2;
    
    const totalAdjustment = tempAdjustment + humidityAdjustment + doseAdjustment;

    const calculatedMin = Math.round(baseMin + totalAdjustment);
    const calculatedMax = Math.round(baseMax + totalAdjustment);
    
    // Ensure min is not greater than max after adjustments
    const finalMin = Math.min(calculatedMin, calculatedMax);
    const finalMax = Math.max(calculatedMin, calculatedMax);

    setClickRange(`${finalMin} - ${finalMax}`);
    setRecommendedClick(Math.round((finalMin + finalMax) / 2));
  }, [activePreset, activeDose]);

  const handleFetchWeather = useCallback(() => {
    if (!navigator.geolocation) {
      alert('La geolocalización no es soportada por tu navegador.');
      return;
    }

    setIsFetchingWeather(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&timezone=auto`;
          
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error('No se pudo obtener la información del clima.');
          }
          
          const data = await response.json();
          const temp = Math.round(data.current.temperature_2m);
          const humidity = data.current.relative_humidity_2m;
          
          updateActivePreset('temperature', temp);
          updateActivePreset('humidity', humidity);

        } catch (error) {
          console.error("Error fetching weather data:", error);
          alert('Ocurrió un error al buscar los datos del clima.');
        } finally {
          setIsFetchingWeather(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert('No se pudo obtener la ubicación. Asegúrate de haber concedido los permisos necesarios.');
        setIsFetchingWeather(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [updateActivePreset]);
  
  const renderInputs = () => {
    const config = BREW_METHODS_CONFIG[activePreset.brewMethod];
    switch (config.type) {
      case 'dose':
        return (
          <div className="input-group">
            <label htmlFor="coffee-dose">Cantidad de Café: <span>{activePreset.coffeeDose}g</span></label>
            <input type="range" id="coffee-dose" min="9" max="30" value={activePreset.coffeeDose} onChange={(e) => updateActivePreset('coffeeDose', Number(e.target.value))} />
          </div>
        );
      case 'water':
        return (
          <div className="input-group">
            <div className="dual-label">
              <label htmlFor="water-amount">Agua: <span>{activePreset.waterAmount}ml</span></label>
              <p className="derived-dose-display">Café Sugerido: <strong>{activeDose}g</strong></p>
            </div>
            <input type="range" id="water-amount" min="150" max="1000" step="10" value={activePreset.waterAmount} onChange={(e) => updateActivePreset('waterAmount', Number(e.target.value))} />
          </div>
        );
      case 'moka': {
        const mokaConfig = config;
        return (
          <div className="input-group">
            <label htmlFor="moka-size">Tamaño de Cafetera Moka</label>
            <select id="moka-size" value={activePreset.mokaSize} onChange={(e) => updateActivePreset('mokaSize', e.target.value)}>
              {Object.keys(mokaConfig.sizes).map(size => (<option key={size} value={size}>{size}</option>))}
            </select>
          </div>
        );
      }
      default: return null;
    }
  };

  const renderTastingFeedback = () => {
    if (activePreset.brewMethod !== 'Espresso') return null;

    return (
        <div className="tasting-feedback-container">
            <div className="input-group">
                <label htmlFor="tasting-notes">Diagnóstico de Sabor</label>
                <select 
                    id="tasting-notes" 
                    value={activePreset.tastingNotes || 'Equilibrado'}
                    onChange={(e) => updateActivePreset('tastingNotes', e.target.value as TastingResult)}
                >
                    <option value="Equilibrado">Equilibrado</option>
                    <option value="Ácido">Ácido / Agrio</option>
                    <option value="Amargo">Amargo / Astringente</option>
                </select>
            </div>
            {activePreset.tastingNotes && activePreset.tastingNotes !== 'Equilibrado' && (
                <div className="feedback-recommendation">
                    <p>{TASTING_RECOMMENDATIONS[activePreset.tastingNotes]}</p>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="calculator-container">
      <header className="calculator-header">
        <button onClick={onBackToMenu} className="home-btn" aria-label="Volver al menú principal">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </button>
        <input 
            className="preset-name-input"
            value={activePreset.name}
            onChange={e => updateActivePreset('name', e.target.value)}
            placeholder="Nombre de la preparación"
            aria-label="Nombre de la preparación"
        />
      </header>
      <main>
        <div className="input-group">
          <label htmlFor="grinder-select">Molino</label>
          <select id="grinder-select" value={activePreset.selectedGrinder} onChange={(e) => updateActivePreset('selectedGrinder', e.target.value as Grinder)}>
            {Object.keys(GRINDERS).map(grinder => (<option key={grinder} value={grinder}>{grinder}</option>))}
          </select>
        </div>

        <details className="recommendations">
          <summary>Ver Cantidades Recomendadas</summary>
          <div className="recommendations-content">
            <p>{BREW_METHODS_CONFIG[activePreset.brewMethod].description}</p>
            {activePreset.brewMethod === 'Moka Italiana' && (
              <div className="moka-doses-recommendations">
                <h4>Dosis por tamaño:</h4>
                <ul>
                  {Object.entries(BREW_METHODS_CONFIG['Moka Italiana'].sizes).map(([size, details]) => (
                    <li key={size}><span>{size}:</span> <strong>{details.dose}g</strong></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>

        {renderInputs()}

        <div className="environment-inputs">
            <header className="environment-header">
                <h3>Condiciones del Día</h3>
                <button onClick={handleFetchWeather} className="fetch-weather-btn" disabled={isFetchingWeather}>
                    {isFetchingWeather ? 'Cargando...' : 'Usar mi ubicación'}
                </button>
            </header>
            <div className="input-group">
              <label htmlFor="temperature">Temperatura: <span>{activePreset.temperature}°C</span></label>
              <input type="range" id="temperature" min="-10" max="40" value={activePreset.temperature} onChange={(e) => updateActivePreset('temperature', Number(e.target.value))} />
            </div>

            <div className="input-group">
              <label htmlFor="humidity">Humedad: <span>{activePreset.humidity}%</span></label>
              <input type="range" id="humidity" min="0" max="100" value={activePreset.humidity} onChange={(e) => updateActivePreset('humidity', Number(e.target.value))} />
            </div>
            <p className="input-note">Los datos del clima son una aproximación. Ajusta manualmente para mayor precisión.</p>
        </div>
        
        <div className="input-group">
            <label htmlFor="notes">Notas de Preparación</label>
            <textarea 
                id="notes" 
                rows={3}
                placeholder="Ej: Grano de Colombia, tueste medio..."
                value={activePreset.notes}
                onChange={e => updateActivePreset('notes', e.target.value)}
            ></textarea>
        </div>

        {renderTastingFeedback()}

        <div className="result-container" aria-live="polite">
          <p className="result-range">{clickRange}</p>
          <p className="result-label">Recomendado</p>
          <span className="result-clicks">{recommendedClick}</span>
        </div>
        
        <button className="save-button" onClick={onSave}>Guardar Selección</button>
      </main>
      
      <footer>
        <p>Nota: Esta es una guía. Ajusta según tu gusto y el tipo de grano.</p>
      </footer>
    </div>
  );
};


// --- CONFIRMATION MODAL ---

const ConfirmationModal = ({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirmation-message">
      <div className="modal-content confirmation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-body">
          <p id="confirmation-message">{message}</p>
        </div>
        <footer className="modal-footer">
          <button onClick={onCancel} className="modal-cancel-btn">Cancelar</button>
          <button onClick={onConfirm} className="modal-confirm-btn">Aceptar</button>
        </footer>
      </div>
    </div>
  );
};


// --- APP CONTAINER ---

const App = () => {
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const savedPresets = localStorage.getItem('coffeePresets');
      return savedPresets ? JSON.parse(savedPresets) : [];
    } catch (error) {
      console.error("Failed to load presets from localStorage", error);
      return [];
    }
  });
  
  const [view, setView] = useState<'menu' | 'calculator'>('menu');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string; } | null>(null);

  // Persist presets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('coffeePresets', JSON.stringify(presets));
    } catch (error) {
      console.error("Failed to save presets to localStorage", error);
    }
  }, [presets]);

  const activePreset = useMemo(() => presets.find(p => p.id === activePresetId), [presets, activePresetId]);
  
  const handleBackToMenu = useCallback(() => {
    setActivePresetId(null);
    setView('menu');
  }, []);

  const handleSave = useCallback(() => {
    const presetToSave = presets.find(p => p.id === activePresetId);
    if (!presetToSave) return;
    // Validation to prevent saving without a name
    if (!presetToSave.name || presetToSave.name.trim() === "") {
        alert("Por favor, dale un nombre a tu preparación antes de guardar.");
        return; // Stop the function
    }
    // State is already updated via updateActivePreset, and useEffect will save. Just go back to menu.
    handleBackToMenu();
  }, [presets, activePresetId, handleBackToMenu]);

  const updateActivePreset = useCallback((key: keyof Preset, value: any) => {
    if (!activePresetId) return;
    setPresets(prev => prev.map(p => (p.id === activePresetId ? { ...p, [key]: value } : p)));
  }, [activePresetId]);
  
  const handleAddNewPreset = useCallback((brewMethod: BrewMethod) => {
    const config = BREW_METHODS_CONFIG[brewMethod];
    const newPreset: Preset = {
      id: `${Date.now()}-${Math.random()}`, // More unique ID
      name: `Nueva ${brewMethod}`,
      brewMethod: brewMethod,
      selectedGrinder: 'Gadnic C10',
      temperature: 15, // New neutral default
      humidity: 50, // New neutral default
      coffeeDose: config.type === 'dose' ? config.defaultDose : 18,
      waterAmount: config.type === 'water' ? config.defaultWater : 250,
      mokaSize: config.type === 'moka' ? config.defaultSize : '3 Tazas (~150ml)',
      notes: '',
      tastingNotes: 'Equilibrado',
    };
    setPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
    setView('calculator');
  }, []);
  
  const handleSelectPreset = useCallback((id: string) => {
    setActivePresetId(id);
    setView('calculator');
  }, []);

  const handleDeletePreset = useCallback((id: string, name: string) => {
    setDeleteConfirmation({ id, name });
  }, []);

  const executeDelete = useCallback(() => {
    if (deleteConfirmation) {
        setPresets(currentPresets => currentPresets.filter(p => p.id !== deleteConfirmation.id));
        setDeleteConfirmation(null);
    }
  }, [deleteConfirmation]);


  return (
    <>
      {view === 'menu' && (
        <MainMenu 
          presets={presets} 
          onSelectPreset={handleSelectPreset}
          onAddNewPreset={handleAddNewPreset}
          onDeletePreset={handleDeletePreset}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      )}
      {view === 'calculator' && activePreset && (
        <CalculatorView 
          activePreset={activePreset} 
          updateActivePreset={updateActivePreset} 
          onBackToMenu={handleBackToMenu}
          onSave={handleSave}
        />
      )}
      {isGuideOpen && <ProportionsGuideModal onClose={() => setIsGuideOpen(false)} />}
      {deleteConfirmation && (
        <ConfirmationModal
          message={`¿Estás seguro de que quieres eliminar la receta '${deleteConfirmation.name}'?`}
          onConfirm={executeDelete}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);