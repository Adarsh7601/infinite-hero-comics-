
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import {useCallback, useState} from 'react';

// Interface for the injected window.aistudio object
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

export const useApiKey = () => {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  // App is 100% free of cost with no subscription required
  const validateApiKey = useCallback(async (): Promise<boolean> => {
    return true;
  }, []);

  const handleApiKeyDialogContinue = useCallback(async () => {
    setShowApiKeyDialog(false);
  }, []);

  return {
    showApiKeyDialog: false,
    setShowApiKeyDialog: () => {},
    validateApiKey,
    handleApiKeyDialogContinue,
  };
};
