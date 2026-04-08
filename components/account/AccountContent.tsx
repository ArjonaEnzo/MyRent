'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/providers/language-provider'
import { updateProfile, updateEmail, updatePassword, uploadAvatar } from '@/lib/actions/profile'
import { toast } from 'sonner'
import { User, Mail, Lock, AlertTriangle, Camera, Loader2 } from 'lucide-react'

interface AccountContentProps {
  profile: {
    fullName: string
    email: string
    avatarUrl: string | null
  }
}

export function AccountContent({ profile }: AccountContentProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl)
  const [isUploadingAvatar, startAvatarTransition] = useTransition()

  // Profile form state
  const [fullName, setFullName] = useState(profile.fullName)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Email form state
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const initials = profile.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : profile.email.slice(0, 2).toUpperCase()

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Show immediate preview
      setAvatarPreview(URL.createObjectURL(file))

      const formData = new FormData()
      formData.append('avatar', file)

      startAvatarTransition(async () => {
        const result = await uploadAvatar(formData)
        if (result.success && result.avatarUrl) {
          setAvatarPreview(result.avatarUrl)
          router.refresh()
          toast.success('Foto de perfil actualizada')
        } else {
          setAvatarPreview(profile.avatarUrl)
          toast.error(result.error ?? 'Error al subir la imagen')
        }
        // Reset input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = ''
      })
    },
    [profile.avatarUrl, router]
  )

  const handleUpdateProfile = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsUpdatingProfile(true)
      try {
        const result = await updateProfile({ fullName })
        if (result.success) {
          toast.success(result.message || t.account.profile.success)
        } else {
          toast.error(result.error || 'Error al actualizar el perfil')
        }
      } catch {
        toast.error('Error al actualizar el perfil')
      } finally {
        setIsUpdatingProfile(false)
      }
    },
    [fullName, t]
  )

  const handleUpdateEmail = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsUpdatingEmail(true)
      try {
        const result = await updateEmail({ email: newEmail, password: emailPassword })
        if (result.success) {
          toast.success(result.message || t.account.email.success)
          setNewEmail('')
          setEmailPassword('')
        } else {
          toast.error(result.error || 'Error al actualizar el email')
        }
      } catch {
        toast.error('Error al actualizar el email')
      } finally {
        setIsUpdatingEmail(false)
      }
    },
    [newEmail, emailPassword, t]
  )

  const handleUpdatePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsUpdatingPassword(true)
      try {
        const result = await updatePassword({ currentPassword, newPassword, confirmNewPassword })
        if (result.success) {
          toast.success(result.message || t.account.password.success)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmNewPassword('')
        } else {
          toast.error(result.error || 'Error al cambiar la contraseña')
        }
      } catch {
        toast.error('Error al cambiar la contraseña')
      } finally {
        setIsUpdatingPassword(false)
      }
    },
    [currentPassword, newPassword, confirmNewPassword, t]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          {t.account.title}
        </h1>
        <p className="text-muted-foreground mt-2">{t.account.subtitle}</p>
      </motion.div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle>{t.account.profile.title}</CardTitle>
                <CardDescription>{t.account.profile.subtitle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Avatar upload */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Foto de perfil"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl font-semibold text-white">
                      {initials}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {isUploadingAvatar ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium">{profile.fullName || profile.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  JPG, PNG o WebP · Máx. 2 MB
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                >
                  {isUploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t.account.profile.fullName}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.account.profile.fullNamePlaceholder}
                  disabled={isUpdatingProfile}
                />
              </div>
              <Button
                type="submit"
                disabled={isUpdatingProfile || fullName === profile.fullName}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isUpdatingProfile ? t.account.profile.saving : t.account.profile.save}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Email Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>{t.account.email.title}</CardTitle>
                <CardDescription>{t.account.email.subtitle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentEmail">{t.account.email.current}</Label>
                <Input
                  id="currentEmail"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">{t.account.email.newEmail}</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t.account.email.newEmailPlaceholder}
                  disabled={isUpdatingEmail}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailPassword">{t.account.email.password}</Label>
                <Input
                  id="emailPassword"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder={t.account.email.passwordPlaceholder}
                  disabled={isUpdatingEmail}
                />
              </div>
              <Button
                type="submit"
                disabled={isUpdatingEmail || !newEmail || !emailPassword}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isUpdatingEmail ? t.account.email.saving : t.account.email.save}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Password Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>{t.account.password.title}</CardTitle>
                <CardDescription>{t.account.password.subtitle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t.account.password.current}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t.account.password.currentPlaceholder}
                  disabled={isUpdatingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t.account.password.new}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.account.password.newPlaceholder}
                  disabled={isUpdatingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">{t.account.password.confirm}</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={t.account.password.confirmPlaceholder}
                  disabled={isUpdatingPassword}
                />
              </div>
              <Button
                type="submit"
                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isUpdatingPassword ? t.account.password.saving : t.account.password.save}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-600 dark:text-red-400">
                  {t.account.danger.title}
                </CardTitle>
                <CardDescription>{t.account.danger.subtitle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {t.account.danger.delete}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t.account.danger.deleteDesc}
              </p>
            </div>
            <Button variant="destructive" disabled className="opacity-50 cursor-not-allowed">
              {t.account.danger.deleteButton}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
