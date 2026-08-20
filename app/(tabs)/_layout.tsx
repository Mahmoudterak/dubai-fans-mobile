import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} />;
}

function CenterTabButton({ onPress, children }: { onPress?: ((...args: any[]) => void); children: React.ReactNode }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.centerTabBtn} activeOpacity={0.85}>
      <View style={styles.centerTabCircle}>
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.border,
           borderTopWidth: 0,
           height: Platform.OS === 'ios' ? 92 : 72,
           paddingBottom: Platform.OS === 'ios' ? 28 : 11,
           paddingTop: 9,
          elevation: 10,
           shadowColor: '#171827',
          shadowOffset: { width: 0, height: -3 },
           shadowOpacity: 0.1,
           shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontFamily: 'Cairo_600SemiBold',
           fontSize: 10,
           marginTop: 3,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'طلباتي',
          tabBarIcon: ({ color, size }) => <TabIcon name="clipboard-list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="request"
        options={{
          title: 'اطلب خدمة',
          tabBarIcon: () => null,
          tabBarButton: (props) => <CenterTabButton {...props} />,
          tabBarLabelStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'المحفظة',
          tabBarIcon: ({ color, size }) => <TabIcon name="wallet" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, size }) => <TabIcon name="account-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerTabCircle: {
     width: 62,
     height: 62,
     borderRadius: 31,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.32,
     shadowRadius: 12,
    elevation: 8,
     borderWidth: 4,
    borderColor: '#fff',
  },
});
