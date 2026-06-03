"use client";

import { useEffect, useState } from "react";
import { Users, Mail, ShoppingCart, FileText, Calendar, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: {
    orders: number;
    quotations: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" /> Users Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse registered sellers, review activity summaries, and audit security accounts.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} className="border-border text-white self-start">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh Users
        </Button>
      </div>

      {/* Table Card */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white">Registered Users</CardTitle>
          <CardDescription>Accounts with active platform access</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-8 w-8 border-4 border-t-primary border-r-transparent rounded-full animate-spin"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg border-border/20">
              <p className="text-muted-foreground text-sm">No users registered.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Profile</TableHead>
                  <TableHead>Email Contact</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead className="text-center">Orders Submitted</TableHead>
                  <TableHead className="text-center">Quotes Requested</TableHead>
                  <TableHead>Member Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold text-white">
                      {user.name || "Unnamed Seller"}
                      <span className="block text-[10px] text-muted-foreground font-mono">
                        UID: {user.id.slice(0, 8)}...
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "destructive" : "success"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1 text-xs text-white font-semibold">
                        <ShoppingCart className="h-3.5 w-3.5 text-violet-400" />
                        {user._count.orders}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1 text-xs text-white font-semibold">
                        <FileText className="h-3.5 w-3.5 text-cyan-400" />
                        {user._count.quotations}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
