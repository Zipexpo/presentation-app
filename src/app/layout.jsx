import { AuthProvider } from './providers'
import '@/app/globals.css'
import 'allotment/dist/style.css'
import { Navbar } from '@/components/layout/Navbar'
import ForcePasswordChange from '@/components/ForcePasswordChange'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ForcePasswordChange />
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}