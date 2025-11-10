import React, { useState } from "react";
import { Package, Settings } from "react-feather";
import { cn } from '../constants/styles';
import PageLayout from '../components/layout/PageLayout';
import InventoryTools from '../components/toolbox/InventoryTools';
import InventoryBabyParts from '../components/toolbox/InventoryBabyParts';

export default function Toolbox() {
  const [activeTab, setActiveTab] = useState('inventory');

  const tabs = [
    { id: 'inventory', label: 'Inventory Tools', icon: Package },
    { id: 'utilities', label: 'Utilities', icon: Settings }
  ];

  return (
    <PageLayout title="Toolbox">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 font-semibold transition-all border-b-2',
                  isActive
                    ? 'text-purple-400 border-purple-400'
                    : 'text-slate-400 border-transparent hover:text-slate-300'
                )}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'inventory' && <InventoryTools />}
          {activeTab === 'utilities' && <InventoryBabyParts />}
        </div>
      </div>
    </PageLayout>
  );
}

