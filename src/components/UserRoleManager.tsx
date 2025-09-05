import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UserCog, Shield, User } from "lucide-react";

interface UserRoleManagerProps {
  users: any[];
  onUserUpdated: () => void;
}

const UserRoleManager = ({ users, onUserUpdated }: UserRoleManagerProps) => {
  const [changingRoles, setChangingRoles] = useState<Set<string>>(new Set());

  const handleRoleChange = async (userId: string, newRole: 'user' | 'agent' | 'admin') => {
    setChangingRoles(prev => new Set([...prev, userId]));
    
    try {
      const { data, error } = await supabase.rpc('update_user_role', {
        _user_id: userId,
        _new_role: newRole,
        _admin_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });

      onUserUpdated();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setChangingRoles(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'agent':
        return <UserCog className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Management</CardTitle>
        <CardDescription>Manage user roles and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{user.full_name}</h3>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                    {getRoleIcon(user.role)}
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                <p className="text-xs text-muted-foreground">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={user.role}
                  onValueChange={(newRole) => handleRoleChange(user.user_id, newRole as 'user' | 'agent' | 'admin')}
                  disabled={changingRoles.has(user.user_id)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserRoleManager;