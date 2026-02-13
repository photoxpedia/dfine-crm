import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, ChevronRight, Check, Plus, ArrowLeft } from 'lucide-react';
import { pricingApi } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { PricingCategory, PricingItem, ProjectType, UnitOfMeasure } from '@/types';

const UNITS: UnitOfMeasure[] = ['EA', 'LF', 'SF', 'SQ', 'PC'];

interface PricingItemPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMultiple: (items: PricingItem[]) => void;
  projectType: ProjectType;
}

export default function PricingItemPicker({
  isOpen,
  onClose,
  onSelectMultiple,
  projectType,
}: PricingItemPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, PricingItem>>(new Map());
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customUnit, setCustomUnit] = useState<UnitOfMeasure>('EA');
  const [customCost, setCustomCost] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customProductUrl, setCustomProductUrl] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['pricing-categories', projectType],
    queryFn: async () => {
      const response = await pricingApi.listCategories({
        projectType,
        includeItems: true,
      });
      return response.data as PricingCategory[];
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedCategory(null);
      setSelectedItems(new Map());
      setShowCustomForm(false);
      resetCustomForm();
    }
  }, [isOpen]);

  const resetCustomForm = () => {
    setCustomName('');
    setCustomDescription('');
    setCustomUnit('EA');
    setCustomCost('');
    setCustomPrice('');
    setCustomProductUrl('');
  };

  if (!isOpen) return null;

  const filteredCategories = categories?.filter((cat) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cat.name.toLowerCase().includes(searchLower) ||
      cat.items?.some((item) => item.name.toLowerCase().includes(searchLower))
    );
  });

  const currentCategory = selectedCategory
    ? categories?.find((c) => c.id === selectedCategory)
    : null;

  const filteredItems = currentCategory?.items?.filter((item) => {
    if (!search) return true;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleItem = (item: PricingItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    if (selectedItems.size > 0) {
      onSelectMultiple(Array.from(selectedItems.values()));
    }
    onClose();
  };

  const handleAddCustomItem = () => {
    if (!customName.trim()) return;
    onSelectMultiple([{
      id: '',
      categoryId: '',
      name: customName.trim(),
      description: customDescription.trim() || undefined,
      unitOfMeasure: customUnit,
      contractorCost: parseFloat(customCost) || 0,
      sellingPrice: parseFloat(customPrice) || 0,
      sortOrder: 0,
      isActive: true,
    }]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-gray-500/75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Add Pricing Items
              </h2>
              {selectedItems.size > 0 && (
                <p className="text-sm text-designer-600 mt-0.5">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search pricing items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className="h-[400px] overflow-hidden flex">
            {showCustomForm ? (
              /* Custom Item Form */
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-lg mx-auto space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="input"
                      placeholder="e.g., Custom Tile Work"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="input"
                      rows={2}
                      placeholder="Detailed description of the item..."
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <select
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value as UnitOfMeasure)}
                        className="input"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contractor Cost</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={customCost}
                          onChange={(e) => setCustomCost(e.target.value)}
                          className="input pl-7"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="input pl-7"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product URL (optional)
                    </label>
                    <input
                      type="url"
                      value={customProductUrl}
                      onChange={(e) => setCustomProductUrl(e.target.value)}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-designer-600" />
              </div>
            ) : (
              <>
                {/* Categories list */}
                <div
                  className={cn(
                    'w-1/3 border-r border-gray-200 overflow-y-auto',
                    selectedCategory && 'hidden md:block'
                  )}
                >
                  {filteredCategories?.map((category) => {
                    const selectedCount = category.items?.filter(
                      (item) => selectedItems.has(item.id)
                    ).length || 0;

                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                          selectedCategory === category.id && 'bg-designer-50'
                        )}
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {category.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {category.items?.length || 0} items
                            {selectedCount > 0 && (
                              <span className="text-designer-600 ml-1">
                                ({selectedCount} selected)
                              </span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    );
                  })}
                </div>

                {/* Items list */}
                <div className="flex-1 overflow-y-auto">
                  {selectedCategory ? (
                    <>
                      <div className="md:hidden p-3 border-b border-gray-200 bg-gray-50">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="text-sm text-designer-600 font-medium"
                        >
                          ← Back to categories
                        </button>
                      </div>

                      {/* Select All in Category */}
                      {filteredItems && filteredItems.length > 0 && (
                        <div className="p-3 border-b border-gray-100 bg-gray-50">
                          <button
                            onClick={() => {
                              const allSelected = filteredItems.every((item) =>
                                selectedItems.has(item.id)
                              );
                              setSelectedItems((prev) => {
                                const next = new Map(prev);
                                if (allSelected) {
                                  filteredItems.forEach((item) => next.delete(item.id));
                                } else {
                                  filteredItems.forEach((item) => next.set(item.id, item));
                                }
                                return next;
                              });
                            }}
                            className="text-sm text-designer-600 hover:text-designer-700 font-medium"
                          >
                            {filteredItems.every((item) => selectedItems.has(item.id))
                              ? 'Deselect all in category'
                              : `Select all ${filteredItems.length} items`}
                          </button>
                        </div>
                      )}

                      <div className="p-2">
                        {filteredItems?.map((item) => {
                          const isSelected = selectedItems.has(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleItem(item)}
                              className={cn(
                                'w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left group',
                                isSelected
                                  ? 'bg-designer-50 hover:bg-designer-100'
                                  : 'hover:bg-gray-50'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-5 h-5 rounded border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors',
                                  isSelected
                                    ? 'bg-designer-600 border-designer-600'
                                    : 'border-gray-300 group-hover:border-designer-400'
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-gray-500">{item.unitOfMeasure}</span>
                                  <span className="text-xs text-gray-400">·</span>
                                  <span className="text-xs text-gray-500">Cost: {formatCurrency(item.contractorCost)}</span>
                                  <span className="text-xs text-gray-400">·</span>
                                  <span className="text-xs font-medium text-gray-700">Sell: {formatCurrency(item.sellingPrice)}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        {filteredItems?.length === 0 && (
                          <p className="text-center text-gray-500 py-8">No items found</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 p-8">
                      <div className="text-center">
                        <p className="font-medium">Select a category</p>
                        <p className="text-sm mt-1">Choose a category from the left to see pricing items</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between">
              {showCustomForm ? (
                <>
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to catalog
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={onClose} className="btn btn-outline">Cancel</button>
                    <button
                      onClick={handleAddCustomItem}
                      disabled={!customName.trim()}
                      className="btn btn-designer"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Custom Item
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowCustomForm(true)}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add custom item
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={onClose} className="btn btn-outline">Cancel</button>
                    <button
                      onClick={handleAddSelected}
                      disabled={selectedItems.size === 0}
                      className="btn btn-designer"
                    >
                      Add {selectedItems.size > 0 ? `${selectedItems.size} ` : ''}Item{selectedItems.size !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
