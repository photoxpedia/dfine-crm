import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Loader2,
  Package,
  FolderOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pricingApi } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { PricingCategory, PricingItem, ProjectType, UnitOfMeasure } from '@/types';

const PROJECT_TYPES: ProjectType[] = ['bathroom', 'kitchen', 'general'];
const UNITS: UnitOfMeasure[] = ['EA', 'LF', 'SF', 'SQ', 'PC'];

export default function PricingConfigPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProjectType>('bathroom');
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewItem, setShowNewItem] = useState<string | null>(null);

  // Fetch categories with items
  const { data, isLoading } = useQuery({
    queryKey: ['pricing-categories', activeTab],
    queryFn: async () => {
      const response = await pricingApi.listCategories({ projectType: activeTab, includeItems: true });
      return response.data as PricingCategory[];
    },
  });

  const categories = data || [];

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; projectType: ProjectType }) => pricingApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-categories'] });
      toast.success('Category created');
      setShowNewCategory(false);
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricingCategory> }) =>
      pricingApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-categories'] });
      toast.success('Category updated');
      setEditingCategory(null);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => pricingApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-categories'] });
      toast.success('Category deleted');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data: Partial<PricingItem>) => pricingApi.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-categories'] });
      toast.success('Item created');
      setShowNewItem(null);
    },
    onError: () => toast.error('Failed to create item'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricingItem> }) =>
      pricingApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-categories'] });
      toast.success('Item updated');
      setEditingItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => pricingApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-categories'] });
      toast.success('Item deleted');
    },
  });

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = categories.filter((cat) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    if (cat.name.toLowerCase().includes(searchLower)) return true;
    return cat.items?.some((item) => item.name.toLowerCase().includes(searchLower));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Configuration</h1>
          <p className="text-gray-500 text-sm mt-1">Manage pricing categories and items</p>
        </div>
        <button
          onClick={() => setShowNewCategory(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {PROJECT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={cn(
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors capitalize',
                activeTab === type
                  ? 'border-admin-500 text-admin-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {type}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* New Category Form */}
      {showNewCategory && (
        <NewCategoryForm
          projectType={activeTab}
          onSubmit={(name) => createCategoryMutation.mutate({ name, projectType: activeTab })}
          onCancel={() => setShowNewCategory(false)}
          isLoading={createCategoryMutation.isPending}
        />
      )}

      {/* Categories List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-gray-500 mb-4">
            {search ? 'Try a different search term' : 'Add your first category to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
              isEditing={editingCategory === category.id}
              onEdit={() => setEditingCategory(category.id)}
              onCancelEdit={() => setEditingCategory(null)}
              onUpdate={(data) => updateCategoryMutation.mutate({ id: category.id, data })}
              onDelete={() => {
                if (confirm('Delete this category and all its items?')) {
                  deleteCategoryMutation.mutate(category.id);
                }
              }}
              showNewItem={showNewItem === category.id}
              onShowNewItem={() => setShowNewItem(category.id)}
              onHideNewItem={() => setShowNewItem(null)}
              onCreateItem={(data) => createItemMutation.mutate({ ...data, categoryId: category.id })}
              editingItem={editingItem}
              onEditItem={setEditingItem}
              onUpdateItem={(id, data) => updateItemMutation.mutate({ id, data })}
              onDeleteItem={(id) => {
                if (confirm('Delete this item?')) {
                  deleteItemMutation.mutate(id);
                }
              }}
              isItemLoading={createItemMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewCategoryForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  projectType: ProjectType;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');

  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="input flex-1"
          autoFocus
        />
        <button
          onClick={() => name && onSubmit(name)}
          disabled={!name || isLoading}
          className="btn btn-primary"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </button>
        <button onClick={onCancel} className="btn btn-outline">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  isExpanded,
  onToggle,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  showNewItem,
  onShowNewItem,
  onHideNewItem,
  onCreateItem,
  editingItem,
  onEditItem,
  onUpdateItem,
  onDeleteItem,
  isItemLoading,
}: {
  category: PricingCategory;
  isExpanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: Partial<PricingCategory>) => void;
  onDelete: () => void;
  showNewItem: boolean;
  onShowNewItem: () => void;
  onHideNewItem: () => void;
  onCreateItem: (data: Partial<PricingItem>) => void;
  editingItem: string | null;
  onEditItem: (id: string | null) => void;
  onUpdateItem: (id: string, data: Partial<PricingItem>) => void;
  onDeleteItem: (id: string) => void;
  isItemLoading: boolean;
}) {
  const [editName, setEditName] = useState(category.name);
  const items = category.items || [];

  return (
    <div className="card overflow-hidden">
      {/* Category Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button onClick={onToggle} className="p-1 text-gray-400 hover:text-gray-600">
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input flex-1"
              autoFocus
            />
            <button onClick={() => onUpdate({ name: editName })} className="btn btn-primary btn-sm">
              <Save className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="btn btn-outline btn-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{category.name}</h3>
              <p className="text-xs text-gray-500">{items.length} items</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onShowNewItem}
                className="btn btn-outline btn-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
              <button onClick={onEdit} className="p-2 text-gray-400 hover:text-gray-600">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Items */}
      {isExpanded && (
        <div>
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b">
            <div className="col-span-4">Item Name</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-2 text-right">Contractor Cost</div>
            <div className="col-span-2 text-right">Selling Price</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* New Item Form */}
          {showNewItem && (
            <NewItemForm
              onSubmit={onCreateItem}
              onCancel={onHideNewItem}
              isLoading={isItemLoading}
            />
          )}

          {/* Item List */}
          {items.length === 0 && !showNewItem ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No items in this category</p>
            </div>
          ) : (
            items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isEditing={editingItem === item.id}
                onEdit={() => onEditItem(item.id)}
                onCancelEdit={() => onEditItem(null)}
                onUpdate={(data) => onUpdateItem(item.id, data)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NewItemForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: Partial<PricingItem>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<UnitOfMeasure>('EA');
  const [contractorCost, setContractorCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const handleSubmit = () => {
    if (!name) return;
    onSubmit({
      name,
      unitOfMeasure: unit,
      contractorCost: parseFloat(contractorCost) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
    });
  };

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-blue-50 border-b items-center">
      <div className="col-span-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="input text-sm"
          autoFocus
        />
      </div>
      <div className="col-span-2">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
          className="input text-sm"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <input
          type="number"
          value={contractorCost}
          onChange={(e) => setContractorCost(e.target.value)}
          placeholder="0.00"
          className="input text-sm text-right"
          min="0"
          step="0.01"
        />
      </div>
      <div className="col-span-2">
        <input
          type="number"
          value={sellingPrice}
          onChange={(e) => setSellingPrice(e.target.value)}
          placeholder="0.00"
          className="input text-sm text-right"
          min="0"
          step="0.01"
        />
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <button
          onClick={handleSubmit}
          disabled={!name || isLoading}
          className="btn btn-primary btn-sm"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </button>
        <button onClick={onCancel} className="btn btn-outline btn-sm">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  item: PricingItem;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: Partial<PricingItem>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unitOfMeasure);
  const [contractorCost, setContractorCost] = useState(item.contractorCost.toString());
  const [sellingPrice, setSellingPrice] = useState(item.sellingPrice.toString());

  if (isEditing) {
    return (
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-yellow-50 border-b items-center">
        <div className="col-span-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input text-sm"
          />
        </div>
        <div className="col-span-2">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
            className="input text-sm"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <input
            type="number"
            value={contractorCost}
            onChange={(e) => setContractorCost(e.target.value)}
            className="input text-sm text-right"
            min="0"
            step="0.01"
          />
        </div>
        <div className="col-span-2">
          <input
            type="number"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="input text-sm text-right"
            min="0"
            step="0.01"
          />
        </div>
        <div className="col-span-2 flex justify-end gap-2">
          <button
            onClick={() => onUpdate({
              name,
              unitOfMeasure: unit,
              contractorCost: parseFloat(contractorCost) || 0,
              sellingPrice: parseFloat(sellingPrice) || 0,
            })}
            className="btn btn-primary btn-sm"
          >
            <Save className="w-4 h-4" />
          </button>
          <button onClick={onCancelEdit} className="btn btn-outline btn-sm">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 items-center group">
      <div className="col-span-4">
        <p className="text-sm font-medium text-gray-900">{item.name}</p>
        {item.description && (
          <p className="text-xs text-gray-500 truncate">{item.description}</p>
        )}
      </div>
      <div className="col-span-2">
        <span className="text-sm text-gray-500">{item.unitOfMeasure}</span>
      </div>
      <div className="col-span-2 text-right">
        <span className="text-sm text-gray-500">{formatCurrency(item.contractorCost)}</span>
      </div>
      <div className="col-span-2 text-right">
        <span className="text-sm font-medium text-gray-900">{formatCurrency(item.sellingPrice)}</span>
      </div>
      <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-600">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
