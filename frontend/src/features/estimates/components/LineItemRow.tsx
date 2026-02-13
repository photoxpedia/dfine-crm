import { useState, useEffect, useRef } from 'react';
import { Trash2, GripVertical, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, debounce } from '@/lib/utils';
import type { EstimateLineItem, UnitOfMeasure } from '@/types';

interface LineItemRowProps {
  item: EstimateLineItem;
  onUpdate: (itemId: string, data: Partial<EstimateLineItem>) => void;
  onDelete: (itemId: string) => void;
  isEditable?: boolean;
}

const UNITS: UnitOfMeasure[] = ['EA', 'LF', 'SF', 'SQ', 'PC'];

export default function LineItemRow({
  item,
  onUpdate,
  onDelete,
  isEditable = true,
}: LineItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(item.quantity.toString());
  const [localContractorCost, setLocalContractorCost] = useState(item.contractorCost.toString());
  const [localSellingPrice, setLocalSellingPrice] = useState(item.sellingPrice.toString());

  const debouncedUpdate = useRef(
    debounce((field: string, value: number) => {
      onUpdate(item.id, { [field]: value });
    }, 500)
  ).current;

  useEffect(() => {
    setLocalQuantity(item.quantity.toString());
    setLocalContractorCost(item.contractorCost.toString());
    setLocalSellingPrice(item.sellingPrice.toString());
  }, [item.quantity, item.contractorCost, item.sellingPrice]);

  const handleQuantityChange = (value: string) => {
    setLocalQuantity(value);
    const num = parseFloat(value) || 0;
    if (num >= 0) {
      debouncedUpdate('quantity', num);
    }
  };

  const handleContractorCostChange = (value: string) => {
    setLocalContractorCost(value);
    const num = parseFloat(value) || 0;
    if (num >= 0) {
      debouncedUpdate('contractorCost', num);
    }
  };

  const handleSellingPriceChange = (value: string) => {
    setLocalSellingPrice(value);
    const num = parseFloat(value) || 0;
    if (num >= 0) {
      debouncedUpdate('sellingPrice', num);
    }
  };

  const margin = item.sellingPrice > 0
    ? ((item.sellingPrice - item.contractorCost) / item.sellingPrice * 100).toFixed(1)
    : '0.0';

  return (
    <div className="group border-b border-gray-100 last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50">
        {isEditable && (
          <button className="cursor-grab text-gray-300 hover:text-gray-500 flex-shrink-0">
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* Item name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isEditable ? (
              <input
                type="text"
                value={item.name}
                onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                className="w-full text-sm font-medium text-gray-900 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none"
                placeholder="Item name"
              />
            ) : (
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
            )}
            {item.productUrl && (
              <a
                href={item.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-designer-500 hover:text-designer-700"
                title="View Product"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {item.isCustom && (
            <span className="text-xs text-designer-600">(Custom)</span>
          )}
          {item.description && !isExpanded && (
            <p className="text-xs text-gray-400 truncate">{item.description}</p>
          )}
        </div>

        {/* Unit */}
        <div className="w-16 flex-shrink-0">
          {isEditable ? (
            <select
              value={item.unitOfMeasure}
              onChange={(e) => onUpdate(item.id, { unitOfMeasure: e.target.value as UnitOfMeasure })}
              className="w-full text-xs text-gray-500 bg-transparent border-0 p-0 focus:ring-0"
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-gray-500">{item.unitOfMeasure}</span>
          )}
        </div>

        {/* Quantity */}
        <div className="w-20 flex-shrink-0">
          {isEditable ? (
            <input
              type="number"
              value={localQuantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              min="0"
              step="0.01"
              className="w-full text-sm text-right bg-transparent border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-designer-500 focus:border-designer-500"
            />
          ) : (
            <p className="text-sm text-right">{item.quantity}</p>
          )}
        </div>

        {/* Contractor Cost */}
        <div className="w-24 flex-shrink-0 hidden md:block">
          {isEditable ? (
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={localContractorCost}
                onChange={(e) => handleContractorCostChange(e.target.value)}
                min="0"
                step="0.01"
                className="w-full text-sm text-right bg-transparent border border-gray-200 rounded pl-5 pr-2 py-1 focus:ring-1 focus:ring-designer-500 focus:border-designer-500"
              />
            </div>
          ) : (
            <p className="text-sm text-right text-gray-500">
              {formatCurrency(item.contractorCost)}
            </p>
          )}
        </div>

        {/* Selling Price */}
        <div className="w-24 flex-shrink-0">
          {isEditable ? (
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={localSellingPrice}
                onChange={(e) => handleSellingPriceChange(e.target.value)}
                min="0"
                step="0.01"
                className="w-full text-sm text-right bg-transparent border border-gray-200 rounded pl-5 pr-2 py-1 focus:ring-1 focus:ring-designer-500 focus:border-designer-500"
              />
            </div>
          ) : (
            <p className="text-sm text-right">{formatCurrency(item.sellingPrice)}</p>
          )}
        </div>

        {/* Total */}
        <div className="w-28 flex-shrink-0 text-right">
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(item.totalSelling)}
          </p>
          <p className="text-xs text-gray-400 hidden md:block">
            Cost: {formatCurrency(item.totalContractor)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {isEditable && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Description / Notes
              </label>
              {isEditable ? (
                <textarea
                  value={item.notes || ''}
                  onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
                  rows={2}
                  className="input text-sm"
                  placeholder="Add notes..."
                />
              ) : (
                <p className="text-gray-700">{item.notes || 'No notes'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Product URL
              </label>
              {isEditable ? (
                <input
                  type="url"
                  value={item.productUrl || ''}
                  onChange={(e) => onUpdate(item.id, { productUrl: e.target.value })}
                  className="input text-sm"
                  placeholder="https://..."
                />
              ) : item.productUrl ? (
                <a
                  href={item.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-designer-600 hover:text-designer-700 flex items-center gap-1"
                >
                  View Product <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-gray-400">No link</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Margin Info
              </label>
              <div className="space-y-1">
                <p className="text-gray-700">
                  Margin: <span className="font-medium">{margin}%</span>
                </p>
                <p className="text-gray-500">
                  Profit: {formatCurrency(item.totalSelling - item.totalContractor)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
