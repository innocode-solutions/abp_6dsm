import { createContext, useContext, useState, type ReactNode } from 'react'

interface HeaderContextData {
  dataSelecionada: Date;
  setDataSelecionada: (data: Date) => void;
  refreshTrigger: number; 
  dispararAtualizacao: () => void;
}

export const HeaderContext = createContext<HeaderContextData>({} as HeaderContextData)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date())
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const dispararAtualizacao = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <HeaderContext.Provider 
      value={{ 
        dataSelecionada, 
        setDataSelecionada, 
        refreshTrigger, 
        dispararAtualizacao 
      }}
    >
      {children}
    </HeaderContext.Provider>
  )
}

export const useHeader = () => useContext(HeaderContext)