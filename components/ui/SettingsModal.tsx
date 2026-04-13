"use client";

import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalCloseButton, Input, FormLabel,
  FormControl, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Text, VStack, HStack, Badge,
} from "@chakra-ui/react";
import { useChatStore } from "@/lib/store";
import { Settings } from "lucide-react";

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, temperature, setTemperature, apiKeyOverride, setApiKeyOverride } =
    useChatStore();

  return (
    <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} size="md">
      <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
      <ModalContent
        bg="var(--card, #12121A)"
        borderColor="rgba(255,255,255,0.08)"
        borderWidth={1}
        borderRadius="xl"
      >
        <ModalHeader display="flex" alignItems="center" gap={2} fontSize="sm" fontWeight={600}>
          <Settings size={16} />
          Curator Settings
        </ModalHeader>
        <ModalCloseButton size="sm" />
        <ModalBody pb={6}>
          <VStack spacing={5} align="stretch">
            <FormControl>
              <FormLabel fontSize="xs" color="gray.500" mb={1.5}>
                OpenRouter API Key Override
              </FormLabel>
              <Input
                type="password"
                placeholder="sk-or-v1-... (uses server key if empty)"
                value={apiKeyOverride}
                onChange={(e) => setApiKeyOverride(e.target.value)}
                size="sm"
                borderRadius="lg"
                fontSize="xs"
                fontFamily="mono"
                _focus={{ borderColor: "#1565C0", boxShadow: "0 0 0 1px #1565C040" }}
              />
              <Text fontSize="xs" color="gray.600" mt={1}>
                Stored locally in your browser only.
              </Text>
            </FormControl>

            <FormControl>
              <HStack justify="space-between" mb={2}>
                <FormLabel fontSize="xs" color="gray.500" m={0}>Temperature</FormLabel>
                <Badge fontFamily="mono" fontSize="xs" colorScheme="blue" variant="subtle" borderRadius="md">
                  {temperature.toFixed(2)}
                </Badge>
              </HStack>
              <Slider value={temperature} onChange={setTemperature} min={0} max={1} step={0.05}>
                <SliderTrack borderRadius="full">
                  <SliderFilledTrack bg="#1565C0" />
                </SliderTrack>
                <SliderThumb boxSize={4} bg="white" border="2px solid" borderColor="#1565C0" />
              </Slider>
              <HStack justify="space-between" mt={1}>
                <Text fontSize="xs" color="gray.600">Precise</Text>
                <Text fontSize="xs" color="gray.600">Creative</Text>
              </HStack>
            </FormControl>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/8 bg-black/20">
              <span className="w-2 h-2 rounded-full bg-success" />
              <div>
                <p className="text-xs font-medium">Gemma 3 27B Instruct</p>
                <p className="text-xs text-text-muted opacity-60">via OpenRouter · Free tier</p>
              </div>
            </div>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
