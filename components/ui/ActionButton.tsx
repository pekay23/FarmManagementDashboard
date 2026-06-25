import React from 'react';
import { LucideIcon } from 'lucide-react';

export function ActionButton({ title, icon: Icon, color, onClick }: { title: string; icon: LucideIcon; color: string; onClick: () => void }) {
    const colors: any = {
        primary: 'bg-primary-600 hover:bg-primary-700',
        yellow: 'bg-yellow-500 hover:bg-yellow-600',
        blue: 'bg-blue-600 hover:bg-blue-700',
        dark: 'bg-gray-800 hover:bg-gray-900',
        red: 'bg-red-600 hover:bg-red-700'
    };
    return (
        <button onClick={onClick} className={`w-full ${colors[color] || colors.primary} text-white py-2.5 rounded-lg font-medium text-[11px] md:text-sm flex flex-col md:flex-row justify-center items-center gap-2 transition-colors shadow-sm`}>
            <Icon className="w-4 h-4" />
            {title}
        </button>
    );
}
