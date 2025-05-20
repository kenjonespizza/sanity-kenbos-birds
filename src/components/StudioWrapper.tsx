import {ToastProvider} from '@sanity/ui'
import {ReactNode} from 'react'

interface StudioWrapperProps {
  children: ReactNode
}

export function StudioWrapper({children}: StudioWrapperProps) {
  return <ToastProvider>{children}</ToastProvider>
}
