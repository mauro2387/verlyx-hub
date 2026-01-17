import React from 'react';
import { Card } from '../ui/card';
import ReservationSystem from '../enhanced/ReservationSystem';
import ReservationList from '../ReservationList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const OwnerReservationSystem: React.FC = () => {
  return (
    <Card className="p-6">
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Mis Reservas</TabsTrigger>
          <TabsTrigger value="new">Nueva Reserva</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#0A1E40] mb-2">Mis Reservas</h3>
            <p className="text-gray-600">Gestione sus reservas de las instalaciones</p>
          </div>
          <ReservationList filterByCreatedBy="owner" />
        </TabsContent>

        <TabsContent value="new">
          <ReservationSystem />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default OwnerReservationSystem;