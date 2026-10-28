import React from "react";
import { Modal, type ModalProps } from "react-native";
import { usePrivacy } from "./PrivacyProvider";
export function PrivateModal(props: ModalProps) {
  const { locked, ready } = usePrivacy();
  return (
    <Modal {...props} visible={props.visible === true && !locked && ready} />
  );
}
