import { ApplicationConfig, provideBrowserGlobalErrorListeners, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  LucideAngularModule,
  Flame, BarChart3, Calendar, Users, User, Wallet, Trophy, FileText,
  LogOut, GraduationCap, Building2, AlertTriangle, Check, CircleCheck,
  Info, Mail, MapPin, Search, PartyPopper, Copy, Coins, Target, Gift,
  ScrollText, Inbox, MessageCircle, Share2, LockOpen, Download, Tag,
  IndianRupee, Sparkles, CircleAlert, Eye, EyeOff, TrendingUp, Heart,
  ArrowRight, ChevronLeft, Menu, X, Clock, Send, ChartNoAxesCombined,
  Smartphone, Plus, CircleX, Pencil, Camera, ChevronRight, ArrowLeft, Trash2,
  Phone, Receipt, Star
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    importProvidersFrom(
      LucideAngularModule.pick({
        Flame, BarChart3, Calendar, Users, User, Wallet, Trophy, FileText,
        LogOut, GraduationCap, Building2, AlertTriangle, Check, CircleCheck,
        Info, Mail, MapPin, Search, PartyPopper, Copy, Coins, Target, Gift,
        ScrollText, Inbox, MessageCircle, Share2, LockOpen, Download, Tag,
        IndianRupee, Sparkles, CircleAlert, Eye, EyeOff, TrendingUp, Heart,
        ArrowRight, ChevronLeft, Menu, X, Clock, Send, ChartNoAxesCombined,
        Smartphone, Plus, CircleX, Pencil, Camera, ChevronRight, ArrowLeft, Trash2,
        Phone, Receipt, Star
      })
    )
  ]
};
