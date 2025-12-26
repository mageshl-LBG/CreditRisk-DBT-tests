import React from 'react';

interface Tab {
    id: string;
    label: string;
    icon: string;
}

interface SimpleTabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    theme: string;
}

export const SimpleTabs: React.FC<SimpleTabsProps> = ({ tabs, activeTab, onTabChange, theme }) => {
    return (
        <div className="flex gap-2 border-b border-white/10 px-8 pt-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-6 py-3 font-bold uppercase tracking-wider text-sm transition-all relative ${activeTab === tab.id
                            ? 'text-white bg-gradient-to-b from-[#00d4aa]/20 to-transparent border-b-4 border-[#00d4aa]'
                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                        }`}
                >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
