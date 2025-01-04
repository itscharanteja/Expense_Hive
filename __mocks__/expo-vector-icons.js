import React from "react";
import { Text } from "react-native";

export const Ionicons = ({ name, size, color }) => <Text>{name}</Text>;

module.exports = "Icon";

export const MaterialIcons = Ionicons;
export const FontAwesome = Ionicons;
export const AntDesign = Ionicons;
