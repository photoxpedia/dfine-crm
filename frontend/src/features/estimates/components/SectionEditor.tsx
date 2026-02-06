import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical, MoreVertical } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import LineItemRow from './LineItemRow';
import type { EstimateSection, EstimateLineItem } from '@/types';

interface SectionEditorProps {
  section: EstimateSection;
  onUpdateSection: (sectionId: string, data: Partial<EstimateSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddItem: (sectionId: string) => void;
  onUpdateItem: (itemId: string, data: Partial<EstimateLineItem>) => void;
  onDeleteItem: (itemId: string) => void;
  isEditable?: boolean;
}

export default function SectionEditor({
  section,
  onUpdateSection,
  onDeleteSection,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  isEditable = true,
}: SectionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const itemCount = section.lineItems?.length || 0;

  return (
    <div className="card overflow-hidden">
      {/* Section Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200',
          isEditable && 'cursor-grab'
        )}
      >
        {isEditable && (
          <GripVertical className="w-4 h-4 text-gray-300" />
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isEditingName && isEditable ? (
          <input
            type="text"
            value={section.name}
            onChange={(e) => onUpdateSection(section.id, { name: e.target.value })}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditingName(false);
            }}
            className="flex-1 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-designer-500 focus:border-designer-500"
            autoFocus
          />
        ) : (
          <button
            onClick={() => isEditable && setIsEditingName(true)}
            className="flex-1 text-left"
          >
            <span className="text-sm font-semibold text-gray-900">
              {section.name}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              ({itemCount} items)
            </span>
          </button>
        )}

        <div className="flex items-center gap-3">
          {/* Subtotals */}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(section.subtotalSelling)}
            </p>
            <p className="text-xs text-gray-500">
              Cost: {formatCurrency(section.subtotalContractor)}
            </p>
          </div>

          {isEditable && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        onAddItem(section.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Rename Section
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        onDeleteSection(section.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Section
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div>
          {/* Column Headers */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
            <div className="w-4" /> {/* Drag handle space */}
            <div className="flex-1">Item</div>
            <div className="w-16">Unit</div>
            <div className="w-20 text-right">Qty</div>
            <div className="w-24 text-right">Cost</div>
            <div className="w-24 text-right">Price</div>
            <div className="w-28 text-right">Total</div>
            <div className="w-16" /> {/* Actions space */}
          </div>

          {/* Line Items */}
          {section.lineItems && section.lineItems.length > 0 ? (
            <div>
              {section.lineItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                  isEditable={isEditable}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <p className="text-sm">No items in this section</p>
              {isEditable && (
                <button
                  onClick={() => onAddItem(section.id)}
                  className="mt-2 text-sm text-designer-600 hover:text-designer-700 font-medium"
                >
                  Add your first item
                </button>
              )}
            </div>
          )}

          {/* Add Item Button */}
          {isEditable && section.lineItems && section.lineItems.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => onAddItem(section.id)}
                className="flex items-center gap-2 text-sm text-designer-600 hover:text-designer-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
          )}

          {/* Section Subtotal (mobile) */}
          <div className="sm:hidden px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Section Total:</span>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(section.subtotalSelling)}
                </p>
                <p className="text-xs text-gray-500">
                  Cost: {formatCurrency(section.subtotalContractor)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
