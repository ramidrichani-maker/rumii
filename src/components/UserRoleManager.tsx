import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UserCog, Shield, User, Trash2, Search, Building2 } from "lucide-react";

interface Agency {
  id: string;
  name: string;
}

interface UserRoleManagerProps {
  users: any[];
  onUserUpdated: () => void;
}

const UserRoleManager = ({ users, onUserUpdated }: UserRoleManagerProps) => {
  const [changingRoles, setChangingRoles] = useState<Set<string>>(new Set());
  const [changingAgency, setChangingAgency] = useState<Set<string>>(new Set());
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);

  useEffect(() => {
    const fetchAgencies = async () => {
      const { data } = await supabase.from('agencies').select('id, name').order('name');
      if (data) setAgencies(data);
    };
    fetchAgencies();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'user' | 'agent' | 'admin' | 'agency_manager' | 'customer_support') => {
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
        description: `User role updated to ${newRole === 'agency_manager' ? 'Agency Manager' : newRole}`,
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

  const handleAgencyChange = async (userId: string, agencyId: string | null) => {
    setChangingAgency(prev => new Set([...prev, userId]));
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ agency_id: agencyId })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: agencyId ? "Agent assigned to agency" : "Agent removed from agency",
      });

      onUserUpdated();
    } catch (error: any) {
      console.error('Error updating agent agency:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update agent agency",
        variant: "destructive",
      });
    } finally {
      setChangingAgency(prev => {
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
      case 'agency_manager':
        return <Building2 className="w-4 h-4" />;
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
      case 'agency_manager':
        return 'default';
      case 'agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    if (role === 'agency_manager') return 'Agency Manager';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    
    return users.filter(user => 
      user.full_name?.toLowerCase().includes(query) || 
      user.phone_number?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeletingUser(userToDelete.id);
    
    try {
      const { data, error } = await supabase.rpc('delete_user_account', {
        _user_id: userToDelete.id,
        _admin_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      onUserUpdated();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(null);
      setUserToDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Management</CardTitle>
        <CardDescription>Manage user roles and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 100))}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No users found matching your search
            </p>
          ) : (
            filteredUsers.map((user) => {
              const userAgency = agencies.find(a => a.id === user.agency_id);
              return (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{user.full_name}</h3>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                        {getRoleIcon(user.role)}
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      {(user.role === 'agent' || user.role === 'agency_manager') && userAgency && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {userAgency.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => handleRoleChange(user.user_id, newRole as 'user' | 'agent' | 'admin' | 'agency_manager')}
                      disabled={changingRoles.has(user.user_id)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="agency_manager">Agency Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="customer_support">Customer Support</SelectItem>
                      </SelectContent>
                    </Select>
                    {(user.role === 'agent' || user.role === 'agency_manager') && (
                      <Select
                        value={user.agency_id || "none"}
                        onValueChange={(value) => handleAgencyChange(user.user_id, value === "none" ? null : value)}
                        disabled={changingAgency.has(user.user_id)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select Agency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Agency</SelectItem>
                          {agencies.map((agency) => (
                            <SelectItem key={agency.id} value={agency.id}>
                              {agency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setUserToDelete({ id: user.user_id, name: user.full_name })}
                      disabled={deletingUser === user.user_id || user.role === 'admin'}
                      title={user.role === 'admin' ? "Cannot delete admin users" : "Delete user"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone and will remove all their data including properties, viewings, and favorites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default UserRoleManager;