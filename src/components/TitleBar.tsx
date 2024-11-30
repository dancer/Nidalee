import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';
import { FaMinus, FaTimes } from 'react-icons/fa';
import { Settings } from '../types';

export const TitleBar: React.FC = () => {
  const handleMinimize = async () => {
    const settings = await invoke<Settings>('get_settings');
    if (settings.minimizeToTray) {
      await appWindow.hide();
    } else {
      await appWindow.minimize();
    }
  };

  return (
    <div 
      data-tauri-drag-region 
      className="h-8 bg-bl-dark border-b border-bl-light-gray flex justify-between items-center select-none"
    >
      <div data-tauri-drag-region className="flex-1 px-4">
        <span className="text-gray-500 text-sm">v0.1.1</span>
      </div>
      
      {/* Window controls */}
      <div className="flex h-full">
        <button
          onClick={handleMinimize}
          className="w-12 h-full hover:bg-bl-light-gray transition-colors inline-flex items-center justify-center"
        >
          <FaMinus size={12} className="text-bl-red" />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="w-12 h-full hover:bg-red-800 transition-colors inline-flex items-center justify-center"
        >
          <FaTimes size={12} className="text-bl-red hover:text-white" />
        </button>
      </div>
    </div>
  );
}; 