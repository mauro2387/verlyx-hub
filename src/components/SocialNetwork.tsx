import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import { Heart, MessageCircle, Share2, TrendingUp, Users, Upload, Camera, Instagram, X } from 'lucide-react';
import { toast } from 'sonner';

interface SocialNetworkProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function SocialNetwork({ user, onLogout }: SocialNetworkProps) {
  const isOwner = user.role === 'owner';
  const [newPost, setNewPost] = useState('');
  const [selectedOwners, setSelectedOwners] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(false);
  const [includePhoto, setIncludePhoto] = useState(false);
  const [postToInstagram, setPostToInstagram] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: 'Administración',
      role: 'admin',
      apartment: null,
      content: 'Mantenimiento de la piscina programado para mañana (1 de noviembre) de 9:00 a 12:00. Por favor planifiquen en consecuencia. ¡Gracias por su comprensión!',
      timestamp: 'hace 2 horas',
      likes: 24,
      comments: 5,
      type: 'announcement',
      isLiked: false
    },
    {
      id: 6,
      author: 'Administración',
      role: 'admin',
      apartment: null,
      content: 'Recordatorio: La reunión de propietarios será este jueves a las 19:00 en el SUM. Confirmen asistencia en la app para coordinar el catering.',
      timestamp: 'hace 6 horas',
      likes: 12,
      comments: 4,
      type: 'announcement',
      isLiked: false
    },
    {
      id: 7,
      author: 'Administración',
      role: 'admin',
      apartment: null,
      content: 'Nuevo servicio: desde hoy contamos con lavado de autos a domicilio en el estacionamiento B2. Reservas disponibles de lunes a sábado de 9:00 a 18:00.',
      timestamp: 'hace 8 horas',
      likes: 18,
      comments: 6,
      type: 'announcement',
      isLiked: false
    },
    {
      id: 8,
      author: 'Administración',
      role: 'admin',
      apartment: null,
      content: 'Encuesta: ¿Qué talleres les gustaría sumar en diciembre? Estamos evaluando clases de cocina, yoga y fotografía. Dejen sus sugerencias en los comentarios.',
      timestamp: 'hace 12 horas',
      likes: 27,
      comments: 10,
      type: 'poll',
      isLiked: false
    },
    {
      id: 2,
      author: 'María Rodríguez',
      role: 'owner',
      apartment: '1205',
      content: '¿Alguien puede recomendar un buen servicio de limpieza? Busco alguien confiable para limpieza semanal.',
      timestamp: 'hace 4 horas',
      likes: 8,
      comments: 12,
      type: 'post',
      isLiked: false
    },
    {
      id: 3,
      author: 'Carlos Silva',
      role: 'owner',
      apartment: '0803',
      content: '¡El nuevo equipamiento del gimnasio es fantástico! Gracias al equipo de administración por las mejoras. Estoy disfrutando mucho las nuevas cintas de correr.',
      timestamp: 'hace 1 día',
      likes: 31,
      comments: 7,
      type: 'post',
      isLiked: true
    },
    {
      id: 4,
      author: 'Administración',
      role: 'admin',
      apartment: null,
      content: '📊 Encuesta rápida: ¿Deberíamos extender el horario del gimnasio hasta las 23:00 en días laborables? ¡Reacciona con ❤️ para Sí o comenta con 💬 tu opinión!',
      timestamp: 'hace 1 día',
      likes: 45,
      comments: 18,
      type: 'poll',
      isLiked: false
    },
    {
      id: 5,
      author: 'Ana Martínez',
      role: 'owner',
      apartment: '1507',
      content: 'Perdí: Un paraguas pequeño negro dejado junto a la piscina ayer por la tarde. Si alguien lo encontró, ¡avísenme por favor!',
      timestamp: 'hace 2 días',
      likes: 3,
      comments: 2,
      type: 'post',
      isLiked: false
    }
  ]);

  const canCreatePosts = user.role !== 'owner';
  const visiblePosts = isOwner ? posts.filter((post) => post.role === 'admin') : posts;

  const handleCreatePost = () => {
    if (!canCreatePosts) {
      toast.error('Solo administración y staff pueden publicar en la red comunitaria.');
      return;
    }

    if (!newPost.trim()) {
      toast.error('El mensaje no puede estar vacío.');
      return;
    }

    if (!selectedOwners && !selectedMaintenance) {
      toast.error('Debes seleccionar al menos un destinatario: Propietarios o Personal de Mantenimiento.');
      return;
    }

    const recipients = [];
    if (selectedOwners) recipients.push('owners');
    if (selectedMaintenance) recipients.push('maintenance');

    const post = {
      id: posts.length + 1,
      author: user.name,
      role: user.role,
      apartment: user.apartment || null,
      content: newPost,
      timestamp: 'Ahora mismo',
      likes: 0,
      comments: 0,
      type: 'post' as const,
      isLiked: false,
      recipients: recipients,
      hasImage: includePhoto && selectedImage !== null,
      postedToInstagram: postToInstagram
    };

    setPosts([post, ...posts]);
    setNewPost('');
    setSelectedOwners(false);
    setSelectedMaintenance(false);
    setIncludePhoto(false);
    setPostToInstagram(false);
    setSelectedImage(null);
    
    const recipientTexts = [];
    if (selectedOwners) recipientTexts.push('propietarios');
    if (selectedMaintenance) recipientTexts.push('personal de mantenimiento');
    const recipientText = recipientTexts.join(' y ');
    
    const extras = [];
    if (includePhoto && selectedImage) extras.push('con imagen');
    if (postToInstagram) extras.push('publicado en Instagram');
    
    const extraText = extras.length > 0 ? ` (${extras.join(', ')})` : '';
    toast.success(`Mensaje enviado a ${recipientText}${extraText}`);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setIncludePhoto(true);
      toast.success('Imagen seleccionada correctamente');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setIncludePhoto(false);
    // Reset the file input
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    toast.success('Imagen removida');
  };

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked }
        : post
    ));
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-100 text-blue-800';
      case 'poll': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[#0A1E40] mb-2" style={{ fontSize: '2rem', fontWeight: 700 }}>
            Red Comunitaria
          </h1>
          {!isOwner && (
            <p className="text-gray-600">Conéctate con vecinos, comparte novedades y mantente informado</p>
          )}
        </div>

        {/* Stats Cards */}
        {isOwner ? (
          <div className="mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>342</div>
                  <p className="text-gray-600 text-sm">Publicaciones este mes</p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>156</div>
                  <p className="text-gray-600 text-sm">Miembros Activos</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>342</div>
                  <p className="text-gray-600 text-sm">Publicaciones este mes</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>87%</div>
                  <p className="text-gray-600 text-sm">Tasa de interacción</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Create Post */}
        {canCreatePosts && (
          <Card className="p-6 mb-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-[#C9A961] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white" style={{ fontWeight: 700 }}>{getInitials(user.name)}</span>
              </div>
              <div className="flex-1">
                {/* Textarea with camera section */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <Textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Escribe tu mensaje para la comunidad..."
                      rows={3}
                    />
                  </div>
                  
                  {/* Camera section */}
                  <div className="w-20 flex flex-col items-center gap-2">
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className={`w-12 h-12 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center ${
                        includePhoto 
                          ? 'border-green-500 bg-green-50 text-green-600' 
                          : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600'
                      }`}
                      title={includePhoto ? 'Imagen seleccionada' : 'Añadir imagen'}
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    {includePhoto && selectedImage && (
                      <span className="text-xs text-green-600 text-center">Imagen</span>
                    )}
                  </div>
                </div>

                {/* Image preview */}
                {selectedImage && (
                  <div className="mb-3 bg-green-50 p-2 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-green-600">📎 {selectedImage.name}</span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="w-5 h-5 text-red-500 hover:text-red-700 flex items-center justify-center transition-colors ml-2"
                      title="Remover imagen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Three buttons in horizontal row */}
                <div className="flex gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOwners(!selectedOwners)}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      selectedOwners 
                        ? 'bg-[#0A1E40] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Propietarios
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMaintenance(!selectedMaintenance)}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      selectedMaintenance 
                        ? 'bg-[#0A1E40] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Mantenimiento
                  </button>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim() || (!selectedOwners && !selectedMaintenance)}
                    className="bg-[#C9A961] hover:bg-[#b8956b] text-white px-6"
                  >
                    Enviar
                  </Button>
                </div>

                {/* Instagram option below send button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPostToInstagram(!postToInstagram)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      postToInstagram 
                        ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600 border border-purple-200' 
                        : 'text-gray-500 hover:text-purple-500 hover:bg-purple-50'
                    }`}
                    title="Publicar en Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                    {postToInstagram ? 'Instagram ✓' : 'Instagram'}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Posts Feed */}
        <div className="space-y-6">
          {visiblePosts.map((post) => (
            <Card key={post.id} className={`p-6 ${post.type === 'announcement' ? 'border-l-4 border-blue-500' : ''}`}>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-[#C9A961] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white" style={{ fontWeight: 700 }}>{getInitials(post.author)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{post.author}</span>
                        {post.apartment && (
                          <span className="text-gray-500 text-sm">• Apt {post.apartment}</span>
                        )}
                        {post.type !== 'post' && (
                          <Badge className={getPostTypeColor(post.type)}>
                            {post.type === 'announcement' && '📢 Anuncio'}
                            {post.type === 'poll' && '📊 Encuesta'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Show recipient info for new posts */}
                      {(post as any).recipients && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {(post as any).recipients.map((recipient: string) => (
                            <Badge key={recipient} variant="outline" className="text-xs">
                              📧 {recipient === 'owners' ? '👥 Propietarios' : '🔧 Mantenimiento'}
                            </Badge>
                          ))}
                          {(post as any).hasImage && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              📷
                            </Badge>
                          )}
                          {(post as any).postedToInstagram && (
                            <Badge variant="outline" className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
                              <Instagram className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <p className="text-gray-500 text-sm">{post.timestamp}</p>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

                  <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 transition-colors ${
                        post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span>{post.comments}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors">
                      <Share2 className="w-5 h-5" />
                      <span>Compartir</span>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <Button variant="outline" className="border-[#0A1E40] text-[#0A1E40]">
            Cargar más publicaciones
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
