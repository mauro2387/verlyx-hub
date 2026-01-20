'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  GripVertical,
  Type,
  List,
  CheckSquare,
  Code,
  Quote,
  Minus,
  AlertCircle,
  Save,
  Loader2,
  MoreHorizontal,
  Star,
  StarOff,
  Copy,
  FolderPlus,
  X,
  Check,
  Hash,
  ListOrdered,
  ArrowLeft,
  Home
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Types
interface Block {
  id: string;
  type: 'heading_1' | 'heading_2' | 'heading_3' | 'paragraph' | 'bulleted_list' | 'numbered_list' | 'todo' | 'code' | 'quote' | 'divider' | 'callout';
  content: string;
  checked?: boolean;
  language?: string;
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  order: number;
}

interface Page {
  id: string;
  title: string;
  icon: string;
  coverUrl?: string;
  blocks: Block[];
  parentId?: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// Block type config
const blockTypes = [
  { type: 'paragraph', label: 'Texto', icon: Type, shortcut: '/p' },
  { type: 'heading_1', label: 'Encabezado 1', icon: Hash, shortcut: '/h1' },
  { type: 'heading_2', label: 'Encabezado 2', icon: Hash, shortcut: '/h2' },
  { type: 'heading_3', label: 'Encabezado 3', icon: Hash, shortcut: '/h3' },
  { type: 'bulleted_list', label: 'Lista con viñetas', icon: List, shortcut: '/ul' },
  { type: 'numbered_list', label: 'Lista numerada', icon: ListOrdered, shortcut: '/ol' },
  { type: 'todo', label: 'Lista de tareas', icon: CheckSquare, shortcut: '/todo' },
  { type: 'code', label: 'Código', icon: Code, shortcut: '/code' },
  { type: 'quote', label: 'Cita', icon: Quote, shortcut: '/quote' },
  { type: 'callout', label: 'Nota destacada', icon: AlertCircle, shortcut: '/callout' },
  { type: 'divider', label: 'Divisor', icon: Minus, shortcut: '/hr' },
] as const;

const calloutStyles = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '💡', text: 'text-blue-300' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '⚠️', text: 'text-amber-300' },
  success: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '✅', text: 'text-green-300' },
  error: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '❌', text: 'text-red-300' },
};

const pageIcons = ['📄', '📝', '📋', '📌', '📎', '📁', '💼', '💡', '🎯', '🚀', '⭐', '🔥', '💻', '🎨', '📊', '📈', '🗂️', '📚', '✨', '🎉'];

export default function WorkspacePage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageIcon, setNewPageIcon] = useState('📄');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch pages from Supabase
  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table may not exist, use empty array
        setPages([]);
      } else {
        const mappedPages: Page[] = (data || []).map((p: any) => ({
          id: p.id,
          title: p.title || 'Sin título',
          icon: p.icon || '📄',
          coverUrl: p.cover_url,
          blocks: p.content?.blocks || [],
          parentId: p.parent_page_id,
          isFavorite: p.is_favorite || false,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setPages(mappedPages);
        
        if (!selectedPage && mappedPages.length > 0) {
          setSelectedPage(mappedPages[0]);
        }
      }
    } catch (err) {
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPage]);

  useEffect(() => {
    fetchPages();
  }, []);

  // Auto-save with debounce
  const savePageToDb = useCallback(async (page: Page) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pages')
        .update({
          title: page.title,
          icon: page.icon,
          cover_url: page.coverUrl,
          content: { blocks: page.blocks },
          is_favorite: page.isFavorite,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id);

      if (!error) {
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const debouncedSave = useCallback((page: Page) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePageToDb(page);
    }, 1000);
  }, [savePageToDb]);

  // Create new page
  const handleCreatePage = async () => {
    const title = newPageTitle.trim() || 'Sin título';
    const initialBlocks: Block[] = [
      { id: crypto.randomUUID(), type: 'heading_1', content: title, order: 0 },
      { id: crypto.randomUUID(), type: 'paragraph', content: '', order: 1 },
    ];

    try {
      const { data, error } = await supabase
        .from('pages')
        .insert({
          title,
          icon: newPageIcon,
          content: { blocks: initialBlocks },
          is_favorite: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating page:', error);
        return;
      }

      const newPage: Page = {
        id: data.id,
        title,
        icon: newPageIcon,
        blocks: initialBlocks,
        parentId: null,
        isFavorite: false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setPages([newPage, ...pages]);
      setSelectedPage(newPage);
      setNewPageTitle('');
      setNewPageIcon('📄');
      setShowNewPageModal(false);
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  // Delete page
  const handleDeletePage = async (pageId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta página?')) return;

    try {
      await supabase.from('pages').delete().eq('id', pageId);
      setPages(pages.filter(p => p.id !== pageId));
      if (selectedPage?.id === pageId) {
        setSelectedPage(pages.find(p => p.id !== pageId) || null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (page: Page) => {
    const updatedPage = { ...page, isFavorite: !page.isFavorite };
    setPages(pages.map(p => p.id === page.id ? updatedPage : p));
    if (selectedPage?.id === page.id) {
      setSelectedPage(updatedPage);
    }
    await savePageToDb(updatedPage);
  };

  // Update page content
  const updatePage = useCallback((updates: Partial<Page>) => {
    if (!selectedPage) return;
    const updatedPage = { ...selectedPage, ...updates, updatedAt: new Date().toISOString() };
    setSelectedPage(updatedPage);
    setPages(pages.map(p => p.id === updatedPage.id ? updatedPage : p));
    debouncedSave(updatedPage);
  }, [selectedPage, pages, debouncedSave]);

  // Block operations
  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    if (!selectedPage) return;
    const updatedBlocks = selectedPage.blocks.map(b =>
      b.id === blockId ? { ...b, ...updates } : b
    );
    updatePage({ blocks: updatedBlocks });
  };

  const addBlock = (type: Block['type'], afterBlockId?: string) => {
    if (!selectedPage) return;
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type,
      content: '',
      order: selectedPage.blocks.length,
      ...(type === 'todo' && { checked: false }),
      ...(type === 'code' && { language: 'javascript' }),
      ...(type === 'callout' && { calloutType: 'info' }),
    };

    let updatedBlocks = [...selectedPage.blocks];
    if (afterBlockId) {
      const index = updatedBlocks.findIndex(b => b.id === afterBlockId);
      updatedBlocks.splice(index + 1, 0, newBlock);
    } else {
      updatedBlocks.push(newBlock);
    }

    updatedBlocks = updatedBlocks.map((b, i) => ({ ...b, order: i }));
    updatePage({ blocks: updatedBlocks });
    setEditingBlockId(newBlock.id);
    setShowBlockMenu(false);
  };

  const deleteBlock = (blockId: string) => {
    if (!selectedPage) return;
    const updatedBlocks = selectedPage.blocks
      .filter(b => b.id !== blockId)
      .map((b, i) => ({ ...b, order: i }));
    updatePage({ blocks: updatedBlocks });
  };

  // Handle keyboard shortcuts
  const handleBlockKeyDown = (e: React.KeyboardEvent, block: Block) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlock('paragraph', block.id);
    } else if (e.key === 'Backspace' && block.content === '' && selectedPage && selectedPage.blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
    } else if (e.key === '/' && block.content === '') {
      e.preventDefault();
      setActiveBlockId(block.id);
      setShowBlockMenu(true);
    }
  };

  // Filter pages
  const filteredPages = pages.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const favoritePages = filteredPages.filter(p => p.isFavorite);
  const regularPages = filteredPages.filter(p => !p.isFavorite && !p.parentId);

  // Render block content
  const renderBlock = (block: Block) => {
    const isEditing = editingBlockId === block.id;
    const commonInputClass = "w-full bg-transparent border-none outline-none resize-none text-gray-200 placeholder-gray-500";

    switch (block.type) {
      case 'heading_1':
        return isEditing ? (
          <input
            autoFocus
            className={`${commonInputClass} text-3xl font-bold`}
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            onBlur={() => setEditingBlockId(null)}
            onKeyDown={(e) => handleBlockKeyDown(e, block)}
            placeholder="Encabezado 1"
          />
        ) : (
          <h1
            className="text-3xl font-bold text-white cursor-text"
            onClick={() => setEditingBlockId(block.id)}
          >
            {block.content || <span className="text-gray-500">Encabezado 1</span>}
          </h1>
        );

      case 'heading_2':
        return isEditing ? (
          <input
            autoFocus
            className={`${commonInputClass} text-2xl font-semibold`}
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            onBlur={() => setEditingBlockId(null)}
            onKeyDown={(e) => handleBlockKeyDown(e, block)}
            placeholder="Encabezado 2"
          />
        ) : (
          <h2
            className="text-2xl font-semibold text-white cursor-text"
            onClick={() => setEditingBlockId(block.id)}
          >
            {block.content || <span className="text-gray-500">Encabezado 2</span>}
          </h2>
        );

      case 'heading_3':
        return isEditing ? (
          <input
            autoFocus
            className={`${commonInputClass} text-xl font-medium`}
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            onBlur={() => setEditingBlockId(null)}
            onKeyDown={(e) => handleBlockKeyDown(e, block)}
            placeholder="Encabezado 3"
          />
        ) : (
          <h3
            className="text-xl font-medium text-white cursor-text"
            onClick={() => setEditingBlockId(block.id)}
          >
            {block.content || <span className="text-gray-500">Encabezado 3</span>}
          </h3>
        );

      case 'paragraph':
        return isEditing ? (
          <textarea
            autoFocus
            className={`${commonInputClass} min-h-[24px]`}
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            onBlur={() => setEditingBlockId(null)}
            onKeyDown={(e) => handleBlockKeyDown(e, block)}
            placeholder="Escribe algo, o presiona '/' para comandos..."
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
        ) : (
          <p
            className="text-gray-300 cursor-text min-h-[24px]"
            onClick={() => setEditingBlockId(block.id)}
          >
            {block.content || <span className="text-gray-500">Escribe algo, o presiona '/' para comandos...</span>}
          </p>
        );

      case 'bulleted_list':
        return (
          <div className="flex items-start gap-3">
            <span className="text-gray-400 mt-0.5 text-lg">•</span>
            {isEditing ? (
              <input
                autoFocus
                className={`${commonInputClass} flex-1`}
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                onBlur={() => setEditingBlockId(null)}
                onKeyDown={(e) => handleBlockKeyDown(e, block)}
                placeholder="Elemento de lista"
              />
            ) : (
              <p
                className="text-gray-300 cursor-text flex-1"
                onClick={() => setEditingBlockId(block.id)}
              >
                {block.content || <span className="text-gray-500">Elemento de lista</span>}
              </p>
            )}
          </div>
        );

      case 'numbered_list':
        const index = selectedPage?.blocks.filter(b => b.type === 'numbered_list').findIndex(b => b.id === block.id) ?? 0;
        return (
          <div className="flex items-start gap-3">
            <span className="text-gray-400 mt-0.5 min-w-[20px]">{index + 1}.</span>
            {isEditing ? (
              <input
                autoFocus
                className={`${commonInputClass} flex-1`}
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                onBlur={() => setEditingBlockId(null)}
                onKeyDown={(e) => handleBlockKeyDown(e, block)}
                placeholder="Elemento de lista"
              />
            ) : (
              <p
                className="text-gray-300 cursor-text flex-1"
                onClick={() => setEditingBlockId(block.id)}
              >
                {block.content || <span className="text-gray-500">Elemento de lista</span>}
              </p>
            )}
          </div>
        );

      case 'todo':
        return (
          <div className="flex items-start gap-3">
            <button
              onClick={() => updateBlock(block.id, { checked: !block.checked })}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                block.checked
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-500 hover:border-gray-400'
              }`}
            >
              {block.checked && <Check className="w-3 h-3 text-white" />}
            </button>
            {isEditing ? (
              <input
                autoFocus
                className={`${commonInputClass} flex-1 ${block.checked ? 'line-through text-gray-500' : ''}`}
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                onBlur={() => setEditingBlockId(null)}
                onKeyDown={(e) => handleBlockKeyDown(e, block)}
                placeholder="Tarea pendiente"
              />
            ) : (
              <p
                className={`cursor-text flex-1 ${block.checked ? 'line-through text-gray-500' : 'text-gray-300'}`}
                onClick={() => setEditingBlockId(block.id)}
              >
                {block.content || <span className="text-gray-500">Tarea pendiente</span>}
              </p>
            )}
          </div>
        );

      case 'code':
        return (
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
              <span className="text-xs text-gray-400 uppercase tracking-wide">{block.language || 'código'}</span>
              <button
                onClick={() => navigator.clipboard.writeText(block.content)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {isEditing ? (
                <textarea
                  autoFocus
                  className="w-full bg-transparent border-none outline-none text-green-400 font-mono text-sm resize-none"
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  onBlur={() => setEditingBlockId(null)}
                  rows={Math.max(3, block.content.split('\n').length)}
                  placeholder="// Escribe tu código aquí..."
                />
              ) : (
                <pre
                  className="text-green-400 font-mono text-sm cursor-text whitespace-pre-wrap"
                  onClick={() => setEditingBlockId(block.id)}
                >
                  {block.content || <span className="text-gray-500">// Escribe tu código aquí...</span>}
                </pre>
              )}
            </div>
          </div>
        );

      case 'quote':
        return (
          <blockquote className="border-l-4 border-gray-600 pl-4 py-1">
            {isEditing ? (
              <textarea
                autoFocus
                className={`${commonInputClass} italic`}
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                onBlur={() => setEditingBlockId(null)}
                onKeyDown={(e) => handleBlockKeyDown(e, block)}
                placeholder="Escribe una cita..."
                rows={1}
              />
            ) : (
              <p
                className="text-gray-400 italic cursor-text"
                onClick={() => setEditingBlockId(block.id)}
              >
                {block.content || <span className="text-gray-500">Escribe una cita...</span>}
              </p>
            )}
          </blockquote>
        );

      case 'callout':
        const style = calloutStyles[block.calloutType || 'info'];
        return (
          <div className={`flex gap-3 p-4 rounded-lg border ${style.bg} ${style.border}`}>
            <span className="text-xl">{style.icon}</span>
            <div className="flex-1">
              {isEditing ? (
                <textarea
                  autoFocus
                  className={`w-full bg-transparent border-none outline-none resize-none ${style.text}`}
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  onBlur={() => setEditingBlockId(null)}
                  onKeyDown={(e) => handleBlockKeyDown(e, block)}
                  placeholder="Escribe una nota..."
                  rows={1}
                />
              ) : (
                <p
                  className={`cursor-text ${style.text}`}
                  onClick={() => setEditingBlockId(block.id)}
                >
                  {block.content || <span className="opacity-50">Escribe una nota...</span>}
                </p>
              )}
            </div>
          </div>
        );

      case 'divider':
        return <hr className="border-gray-700 my-2" />;

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Back Button */}
        <div className="p-3 border-b border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </Link>
        </div>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Workspace
            </h1>
            <button
              onClick={() => setShowNewPageModal(true)}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar páginas..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Favorites */}
          {favoritePages.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Favoritos
              </div>
              {favoritePages.map(page => (
                <PageItem
                  key={page.id}
                  page={page}
                  isSelected={selectedPage?.id === page.id}
                  onSelect={() => setSelectedPage(page)}
                  onDelete={() => handleDeletePage(page.id)}
                  onToggleFavorite={() => toggleFavorite(page)}
                />
              ))}
            </div>
          )}

          {/* Regular Pages */}
          <div>
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Páginas
            </div>
            {regularPages.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm mb-3">No hay páginas aún</p>
                <button
                  onClick={() => setShowNewPageModal(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Crear primera página
                </button>
              </div>
            ) : (
              regularPages.map(page => (
                <PageItem
                  key={page.id}
                  page={page}
                  isSelected={selectedPage?.id === page.id}
                  onSelect={() => setSelectedPage(page)}
                  onDelete={() => handleDeletePage(page.id)}
                  onToggleFavorite={() => toggleFavorite(page)}
                />
              ))
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{pages.length} páginas</span>
            {isSaving && (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Guardando...
              </span>
            )}
            {!isSaving && lastSaved && (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-400" />
                Guardado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPage ? (
          <>
            {/* Page Header */}
            <div className="px-16 pt-16 pb-4">
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="text-5xl hover:bg-gray-800 p-2 rounded-lg transition-colors relative"
                >
                  {selectedPage.icon}
                  {showIconPicker && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 grid grid-cols-5 gap-2">
                      {pageIcons.map(icon => (
                        <button
                          key={icon}
                          onClick={(e) => {
                            e.stopPropagation();
                            updatePage({ icon });
                            setShowIconPicker(false);
                          }}
                          className="text-2xl p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </button>
                <input
                  type="text"
                  value={selectedPage.title}
                  onChange={(e) => updatePage({ title: e.target.value })}
                  className="text-4xl font-bold bg-transparent border-none outline-none text-white flex-1"
                  placeholder="Sin título"
                />
              </div>
              <p className="text-sm text-gray-500">
                Última edición: {new Date(selectedPage.updatedAt).toLocaleString('es-ES')}
              </p>
            </div>

            {/* Page Content */}
            <div className="flex-1 overflow-y-auto px-16 pb-32">
              <div className="max-w-3xl space-y-1">
                {selectedPage.blocks.map(block => (
                  <div key={block.id} className="group relative py-1">
                    {/* Block Controls */}
                    <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          setActiveBlockId(block.id);
                          setShowBlockMenu(true);
                        }}
                        className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded"
                        title="Agregar bloque"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded cursor-grab"
                        title="Arrastrar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Block Delete */}
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {renderBlock(block)}
                  </div>
                ))}

                {/* Add new block button */}
                <button
                  onClick={() => addBlock('paragraph')}
                  className="w-full py-3 text-left text-gray-600 hover:text-gray-400 text-sm flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar bloque
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-20 h-20 mx-auto text-gray-700 mb-6" />
              <h2 className="text-2xl font-bold text-gray-300 mb-2">Bienvenido a Workspace</h2>
              <p className="text-gray-500 mb-6 max-w-md">
                Un espacio para organizar tus ideas, notas, documentación y más. 
                Similar a Notion, pero integrado en Verlyx Hub.
              </p>
              <button
                onClick={() => setShowNewPageModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Crear tu primera página
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Block Menu */}
      {showBlockMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setShowBlockMenu(false)}>
          <div
            className="absolute bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-2 w-72"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Bloques básicos</div>
            {blockTypes.map(({ type, label, icon: Icon, shortcut }) => (
              <button
                key={type}
                onClick={() => addBlock(type, activeBlockId || undefined)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{label}</div>
                  <div className="text-gray-500 text-xs">{shortcut}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Page Modal */}
      {showNewPageModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewPageModal(false)}>
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nueva Página</h2>
              <button
                onClick={() => setShowNewPageModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Icono</label>
                <div className="flex flex-wrap gap-2">
                  {pageIcons.slice(0, 10).map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewPageIcon(icon)}
                      className={`text-2xl p-2 rounded-lg transition-colors ${
                        newPageIcon === icon
                          ? 'bg-blue-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="Mi nueva página"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewPageModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreatePage}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Crear Página
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Page Item Component
function PageItem({
  page,
  isSelected,
  onSelect,
  onDelete,
  onToggleFavorite,
}: {
  page: Page;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
          isSelected
            ? 'bg-blue-600/20 text-blue-400'
            : 'text-gray-300 hover:bg-gray-800'
        }`}
      >
        <span className="text-lg">{page.icon}</span>
        <span className="flex-1 truncate text-sm">{page.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-all rounded"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </button>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 text-left"
            >
              {page.isFavorite ? (
                <>
                  <StarOff className="w-4 h-4" />
                  Quitar de favoritos
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  Agregar a favoritos
                </>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 text-left"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
