
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon, EditIcon, SaveIcon, DownloadIcon, TrashIcon } from './components/Icons';
import { ImageData, MetadataField } from './types';
import { 
  fileToBase64, 
  getMetadataFromBase64, 
  injectMetadataToBase64, 
  KNOWN_TAGS, 
  formatExifValue,
  parseExifValue
} from './services/exifService';

const App: React.FC = () => {
  const [image, setImage] = useState<ImageData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'0th' | 'Exif' | 'GPS'>('0th');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, sube un archivo de imagen válido (JPEG preferiblemente).');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const base64 = await fileToBase64(file);
    const exifObj = getMetadataFromBase64(base64);
    
    // Construct field list from known tags + current values
    const allFields: MetadataField[] = [];
    
    (Object.keys(KNOWN_TAGS) as Array<keyof typeof KNOWN_TAGS>).forEach(group => {
      KNOWN_TAGS[group].forEach(tag => {
        const val = exifObj[group][tag.id];
        allFields.push({
          id: `${group}_${tag.id}`,
          label: tag.label,
          group: group as any,
          value: formatExifValue(val),
          isEditing: false
        });
      });
    });

    setImage({
      file,
      previewUrl,
      base64,
      fields: allFields
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = (id: string, newValue: string) => {
    if (!image) return;
    setImage({
      ...image,
      fields: image.fields.map(f => f.id === id ? { ...f, value: newValue } : f)
    });
  };

  const toggleEdit = (id: string) => {
    if (!image) return;
    setImage({
      ...image,
      fields: image.fields.map(f => f.id === id ? { ...f, isEditing: !f.isEditing } : f)
    });
  };

  const saveField = (id: string) => {
    if (!image) return;
    setImage({
      ...image,
      fields: image.fields.map(f => f.id === id ? { ...f, isEditing: false } : f)
    });
  };

  const handleDownload = () => {
    if (!image) return;
    
    // 1. Load current EXIF
    const exifObj = getMetadataFromBase64(image.base64);
    
    // 2. Update EXIF object from UI fields
    image.fields.forEach(field => {
      const [group, tagIdStr] = field.id.split('_');
      const tagId = parseInt(tagIdStr);
      const parsedVal = parseExifValue(field.value, tagId);
      
      if (parsedVal !== undefined && parsedVal !== '') {
        (exifObj as any)[group][tagId] = parsedVal;
      }
    });

    // 3. Inject back into image
    const finalBase64 = injectMetadataToBase64(image.base64, exifObj);
    
    // 4. Download
    const link = document.createElement('a');
    link.href = finalBase64;
    link.download = `edited_${image.file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetImage = () => {
    if (image) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
  };

  const currentFields = image?.fields.filter(f => f.group === activeTab) || [];

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <span className="font-bold text-xl italic">ME</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800">
              Metadata <span className="text-indigo-600">Editaitor</span>
            </h1>
          </div>
          {image && (
            <button 
              onClick={handleDownload}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <DownloadIcon />
              <span className="hidden sm:inline">Guardar y Descargar</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        {!image ? (
          <div 
            className={`mt-12 group relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer h-96 ${
              isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => e.target.files && handleFile(e.target.files[0])} 
              className="hidden" 
              accept="image/jpeg,image/jpg"
            />
            <div className={`p-6 rounded-full transition-all duration-500 mb-6 ${isDragging ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'}`}>
              <UploadIcon className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 text-slate-700">Comienza a editar</h3>
            <p className="text-slate-500 text-center max-w-md">
              Suelta tu foto JPEG aquí para visualizar y editar sus metadatos reales de forma permanente.
            </p>
            <div className="mt-8 px-8 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              Seleccionar Imagen
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Left Column: Preview */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 sticky top-24">
                <div className="relative group overflow-hidden rounded-2xl aspect-square bg-slate-100 flex items-center justify-center">
                  <img 
                    src={image.previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                  <button 
                    onClick={resetImage}
                    className="absolute top-4 right-4 p-2.5 bg-white/90 hover:bg-red-500 hover:text-white text-slate-600 rounded-xl shadow-xl transition-all"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Detalles del archivo</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-slate-400 text-xs">Nombre</span>
                      <span className="font-semibold text-slate-700 break-all">{image.file.name}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs">Tamaño</span>
                      <span className="font-semibold text-slate-700">{(image.file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Metadata Editor */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 p-2">
                  <button 
                    onClick={() => setActiveTab('0th')}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all ${activeTab === '0th' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    General
                  </button>
                  <button 
                    onClick={() => setActiveTab('Exif')}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'Exif' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Cámara
                  </button>
                  <button 
                    onClick={() => setActiveTab('GPS')}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'GPS' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    GPS
                  </button>
                </div>

                {/* Fields List */}
                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {currentFields.length > 0 ? currentFields.map((field) => (
                    <div 
                      key={field.id} 
                      className={`group p-4 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center ${
                        field.isEditing 
                          ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/5' 
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          {field.label}
                        </label>
                        {field.isEditing ? (
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveField(field.id)}
                            className="w-full bg-white border border-indigo-300 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                            autoFocus
                            placeholder="Escribe un valor..."
                          />
                        ) : (
                          <div className={`font-semibold py-1 transition-colors ${field.value ? 'text-slate-700' : 'text-slate-300 italic'}`}>
                            {field.value || 'No establecido'}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 md:mt-0 md:ml-4 flex justify-end">
                        <button
                          onClick={() => field.isEditing ? saveField(field.id) : toggleEdit(field.id)}
                          className={`p-3 rounded-xl transition-all ${
                            field.isEditing 
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' 
                              : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {field.isEditing ? <SaveIcon /> : <EditIcon />}
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center">
                      <p className="text-slate-400 font-medium italic">No hay metadatos disponibles en esta categoría.</p>
                    </div>
                  )}
                </div>

                <div className="mt-auto p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Listo para editar
                  </div>
                  <div>
                    Modo: Edición Binaria Real
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm font-semibold tracking-wide">
            Aitor Sánchez Gutiérrez &copy; 2026
          </p>
          <div className="mt-6 flex justify-center space-x-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="https://aitorblog.infinityfreeapp.com/" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">AitorBlog</a>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Privacidad</span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Github</span>
          </div>
        </div>
      </footer>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
