import React, { useState } from 'react';
import { TradingRule } from './types';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square,
  AlertTriangle,
  Flame,
  Award,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface RulesProps {
  rules: TradingRule[];
  onAddRule: (rule: Omit<TradingRule, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onToggleRule: (id: string, isActive: boolean) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

export const Rules: React.FC<RulesProps> = ({
  rules,
  onAddRule,
  onToggleRule,
  onDeleteRule
}) => {
  const [newRuleText, setNewRuleText] = useState('');
  const [category, setCategory] = useState<'Pre-trade' | 'Daily' | 'Risk'>('Pre-trade');
  
  // Local checklist interactive checked state (session-only, resets on reload for discipline)
  const [checkedRules, setCheckedRules] = useState<string[]>([]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;

    try {
      await onAddRule({
        ruleText: newRuleText,
        category,
        isActive: true
      });
      setNewRuleText('');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleChecklist = (ruleId: string) => {
    if (checkedRules.includes(ruleId)) {
      setCheckedRules(checkedRules.filter(id => id !== ruleId));
    } else {
      setCheckedRules([...checkedRules, ruleId]);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Risk': return 'text-terminal-red border-terminal-red/30 bg-terminal-red/5';
      case 'Pre-trade': return 'text-terminal-accent border-terminal-accent/30 bg-terminal-accent/5';
      case 'Daily': return 'text-terminal-green border-terminal-green/30 bg-terminal-green/5';
      default: return 'text-white border-white/15 bg-white/5';
    }
  };

  const categories: ('Pre-trade' | 'Daily' | 'Risk')[] = ['Pre-trade', 'Daily', 'Risk'];

  // Default default rules for newly registered users to give them an awesome starting structure
  const defaultChecklistRules = rules.length === 0;

  return (
    <div id="journal-rules" className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Rules Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border/30 pb-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center">
            <ShieldCheck className="w-5 h-5 text-terminal-accent mr-2" />
            Operational Rules & Pre-Flight Checklists
          </h2>
          <p className="text-[10px] font-mono text-gray-500 uppercase mt-0.5">Define your custom risk bounds, entry rules, and run checklists before every trade</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Add Custom Rule */}
        <div className="terminal-card border border-terminal-border p-5 bg-black/15 flex flex-col h-fit">
          <h3 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center border-b border-terminal-border/20 pb-2">
            <Plus className="w-4 h-4 text-terminal-accent mr-1.5" />
            Add Rule/Checklist Item
          </h3>
          <form onSubmit={handleAdd} className="space-y-4 text-xs font-mono">
            <div className="flex flex-col space-y-1.5">
              <label className="text-gray-500 uppercase text-[9px] tracking-wider">Rule Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 text-white focus:border-terminal-accent outline-none cursor-pointer"
              >
                <option value="Pre-trade">Pre-trade Checklist</option>
                <option value="Daily">Daily Protocols</option>
                <option value="Risk">Risk Management Bounds</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-gray-500 uppercase text-[9px] tracking-wider">Rule Description</label>
              <textarea
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                className="bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white focus:border-terminal-accent outline-none h-24 resize-none"
                placeholder="e.g. Wait for 5m candle closing to confirm entry..."
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded bg-white text-black font-black uppercase tracking-widest transition-all text-[10px]"
            >
              Add New Rule
            </button>
          </form>

          {/* Quick discipline warning */}
          <div className="mt-6 p-4 bg-terminal-red/10 border border-terminal-red/20 rounded flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-terminal-red shrink-0 mt-0.5" />
            <p className="text-[9px] text-gray-400 uppercase font-mono leading-relaxed">
              <span className="text-white font-bold">DISCIPLINE WARNING:</span> 90% of retail blowouts are due to rule deviation. Define strict guidelines and stick to them.
            </p>
          </div>
        </div>

        {/* Right Columns: Interactive pre-trade flight panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="terminal-card border border-terminal-border p-6 bg-black/10">
            <div className="flex items-center justify-between border-b border-terminal-border/20 pb-3 mb-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center">
                <CheckSquare className="w-4 h-4 text-terminal-accent mr-2" />
                Active Session Pre-Flight panel
              </h3>
              {rules.length > 0 && (
                <span className="text-[10px] font-mono font-bold text-terminal-accent bg-terminal-accent/10 border border-terminal-accent/20 px-2.5 py-0.5 rounded">
                  Compliance: {checkedRules.length} / {rules.filter(r => r.isActive).length} Verified
                </span>
              )}
            </div>

            {rules.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-terminal-border bg-black/25 rounded">
                <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest block mb-4">
                  Define your custom trading rules in the left panel to begin your checklists.
                </span>
                
                {/* Default Template Button */}
                <button
                  onClick={async () => {
                    const defaults: { text: string; cat: 'Pre-trade' | 'Daily' | 'Risk' }[] = [
                      { text: 'Verify higher timeframe trend bias before execution.', cat: 'Pre-trade' },
                      { text: 'Confirm Risk-to-Reward ratio is at least 1:2 on entry parameters.', cat: 'Pre-trade' },
                      { text: 'Risk maximum 1.5% of total capital on this position.', cat: 'Risk' },
                      { text: 'Daily loss limit set to maximum 3% of account size.', cat: 'Risk' },
                      { text: 'Stop trading entirely after 3 consecutive losses.', cat: 'Daily' },
                      { text: 'Check macroeconomic calendar for high-impact news releases.', cat: 'Pre-trade' },
                    ];
                    for (const rule of defaults) {
                      await onAddRule({ ruleText: rule.text, category: rule.cat, isActive: true });
                    }
                  }}
                  className="bg-terminal-accent/15 border border-terminal-accent/30 text-terminal-accent px-4 py-2 text-[10px] uppercase font-bold rounded hover:bg-terminal-accent hover:text-black transition-all"
                >
                  Load Elite Starter Template Rules
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map((cat) => {
                  const categoryRules = rules.filter(r => r.category === cat);
                  if (categoryRules.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-3">
                      <div className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider rounded border w-fit ${getCategoryColor(cat)}`}>
                        {cat === 'Pre-trade' ? 'Pre-trade Checklist' : cat === 'Risk' ? 'Risk Guidelines' : 'Daily Protocols'}
                      </div>

                      <div className="space-y-2">
                        {categoryRules.map((rule) => {
                          const isChecked = checkedRules.includes(rule.id);
                          return (
                            <div 
                              key={rule.id}
                              className={`flex items-start justify-between p-3 rounded border font-mono text-xs transition-all duration-200 ${
                                !rule.isActive 
                                  ? 'bg-black/30 border-white/5 opacity-40' 
                                  : isChecked 
                                    ? 'bg-terminal-accent/5 border-terminal-accent/20 text-terminal-accent' 
                                    : 'bg-terminal-bg/40 border-terminal-border/50 text-gray-300 hover:border-terminal-border hover:bg-terminal-accent/[0.01]'
                              }`}
                            >
                              <div 
                                className="flex items-start space-x-3 cursor-pointer flex-1"
                                onClick={() => rule.isActive && toggleChecklist(rule.id)}
                              >
                                {rule.isActive ? (
                                  isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-terminal-accent shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                  )
                                ) : (
                                  <Square className="w-4 h-4 text-gray-800 shrink-0 mt-0.5" />
                                )}
                                <span className={`leading-relaxed uppercase text-[10px] ${isChecked ? 'line-through text-terminal-accent/60' : ''}`}>
                                  {rule.ruleText}
                                </span>
                              </div>

                              <div className="flex items-center space-x-2 pl-4">
                                <button
                                  onClick={() => onToggleRule(rule.id, !rule.isActive)}
                                  className="text-gray-500 hover:text-white transition-colors"
                                  title={rule.isActive ? 'Deactivate Rule' : 'Activate Rule'}
                                >
                                  {rule.isActive ? (
                                    <ToggleRight className="w-5 h-5 text-terminal-accent" />
                                  ) : (
                                    <ToggleLeft className="w-5 h-5 text-gray-600" />
                                  )}
                                </button>
                                <button
                                  onClick={() => onDeleteRule(rule.id)}
                                  className="text-gray-600 hover:text-terminal-red transition-colors"
                                  title="Delete Rule"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
