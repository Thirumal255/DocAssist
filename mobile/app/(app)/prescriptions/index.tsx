import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../../constants';

export default function PrescriptionsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Records</Text></View>
      <View style={styles.content}>
        <Ionicons name="document-text-outline" size={64} color={Colors.muted} />
        <Text style={styles.text}>Prescription records will appear here</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing['3xl'], paddingTop: Spacing['3xl'], paddingBottom: Spacing.lg },
  title: { fontSize: Typography.fontSize['4xl'], fontWeight: '600', color: Colors.navy },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: Typography.fontSize.lg, color: Colors.muted, marginTop: Spacing.xl },
});
