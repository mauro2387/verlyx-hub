'use client';

import { useEffect, useState } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, SearchInput, Select, EmptyState, Loading, Modal, Input, Textarea, ConfirmDialog } from '@/components/ui';
import { useDocumentsStore } from '@/lib/store';
import { Document } from '@/lib/types';
import { formatFileSize, formatDate, cn } from '@/lib/utils';

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) {
    return (
      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  if (mimeType.includes('image')) {
    return (
      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return (
      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  );
};

export default function DocumentsPage() {
  const { 
    documents, 
    isLoading, 
    fetchDocuments, 
    addDocument, 
    updateDocument, 
    deleteDocument,
    currentFolder,
    setCurrentFolder,
    filter,
    setFilter,
    getFilteredDocuments,
    getFolders
  } = useDocumentsStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    folder: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments = getFilteredDocuments();
  const folders = getFolders();

  const handleOpenModal = (doc?: Document) => {
    if (doc) {
      setEditingDocument(doc);
      setFormData({
        name: doc.name,
        description: doc.description || '',
        folder: doc.folder || '',
      });
    } else {
      setEditingDocument(null);
      setFormData({
        name: '',
        description: '',
        folder: currentFolder || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const docData = {
      name: formData.name,
      description: formData.description || null,
      folder: formData.folder || 'General',
      filePath: `/documents/${formData.name.toLowerCase().replace(/\s/g, '-')}`,
      mimeType: 'application/octet-stream',
      size: 0,
    };

    if (editingDocument) {
      updateDocument(editingDocument.id, docData);
    } else {
      addDocument(docData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (doc: Document) => {
    setDocToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (docToDelete) {
      deleteDocument(docToDelete.id);
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Documentos"
        description={`${documents.length} archivos`}
        actions={
          <Button onClick={() => handleOpenModal()}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Subir Documento
          </Button>
        }
      />

      <div className="flex gap-6">
        {/* Sidebar - Folders */}
        <div className="w-64 flex-shrink-0">
          <Card>
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Carpetas</h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => setCurrentFolder(null)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  currentFolder === null ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Todos los archivos
              </button>
              {folders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setCurrentFolder(folder)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    currentFolder === folder ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {folder}
                  <span className="ml-auto text-xs text-gray-400">
                    {documents.filter(d => d.folder === folder).length}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search */}
          <Card className="mb-6">
            <div className="p-4">
              <SearchInput
                placeholder="Buscar documentos..."
                value={filter.search}
                onChange={(e) => setFilter({ search: e.target.value })}
                onClear={() => setFilter({ search: '' })}
              />
            </div>
          </Card>

          {/* Documents Grid */}
          {filteredDocuments.length === 0 ? (
            <EmptyState
              title="No hay documentos"
              description={currentFolder ? `No hay archivos en "${currentFolder}"` : 'Sube tu primer documento'}
              icon={
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
              action={<Button onClick={() => handleOpenModal()}>Subir Documento</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} hoverable>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      {getFileIcon(doc.mimeType || '')}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                        <p className="text-sm text-gray-500">{doc.folder}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <span>{formatFileSize(doc.size || 0)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-gray-500 mt-3 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(doc)}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(doc)}>
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDocument ? 'Editar Documento' : 'Nuevo Documento'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre *"
            placeholder="Nombre del documento"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Carpeta"
            placeholder="Carpeta"
            value={formData.folder}
            onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
            helperText="Deja vacío para usar 'General'"
          />
          <Textarea
            label="Descripción"
            placeholder="Descripción del documento..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingDocument ? 'Guardar Cambios' : 'Crear Documento'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Documento"
        message={`¿Estás seguro de que deseas eliminar "${docToDelete?.name}"?`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
