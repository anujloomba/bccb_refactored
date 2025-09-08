# MODIFIED: Android-compatible imports
import json
import os
import uuid
from datetime import datetime
from kivy.utils import platform

# Check if we're running on Android
IS_ANDROID = platform == 'android'

# Only import heavy packages if not on Android
if not IS_ANDROID:
    try:
        import matplotlib
        matplotlib.use('Agg')
        import pandas as pd
        PANDAS_AVAILABLE = True
    except ImportError:
        PANDAS_AVAILABLE = False
else:
    PANDAS_AVAILABLE = False

# MODIFIED: Add this block to fix Android permissions issue on startup
from kivy.utils import platform
if platform == 'android':
    from android.permissions import request_permissions, Permission
    from jnius import autoclass
    # Get the path to the app's private, writable storage directory
    PythonActivity = autoclass('org.kivy.android.PythonActivity')
    activity = PythonActivity.mActivity
    app_path = activity.getFilesDir().getAbsolutePath()
    # Set KIVY_HOME to this writable directory before Kivy initializes
    os.environ['KIVY_HOME'] = app_path

    # Request runtime permissions
    request_permissions([Permission.WRITE_EXTERNAL_STORAGE, Permission.READ_EXTERNAL_STORAGE])

from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.gridlayout import GridLayout
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.scrollview import ScrollView
from kivy.uix.tabbedpanel import TabbedPanelItem

from ui_components import FullWidthTabbedPanel, PlayerManager, ScoringScreen, ScorecardScreen, AnalysisScreen, PlayerAnalyticsScreen


# =============================================================================
# Main App Class
# =============================================================================
class CricketApp(App):
    def build(self):
        self.title = "Cricket Team Manager"
        self.panel = FullWidthTabbedPanel(do_default_tab=False, tab_pos='top_mid')
        self.panel.tab_height = '60dp'
        self.pm = PlayerManager()
        self.pm.main_tab_panel = self.panel  # Give PlayerManager access to main tab panel
        self.pm.tab_panel = self.panel
        self.is_second_innings = False
        self.innings1_data = {}
        self.innings2_data = {}

        manage_layout = BoxLayout(orientation='vertical')
        player_list_scroll = ScrollView()
        self.pm.ids['player_list'] = GridLayout(cols=1, size_hint_y=None, spacing=5)
        self.pm.ids['player_list'].bind(minimum_height=self.pm.ids['player_list'].setter('height'))
        player_list_scroll.add_widget(self.pm.ids['player_list'])
        
        # Bottom buttons layout
        bottom_buttons = BoxLayout(orientation='horizontal', size_hint_y=None, height=100, spacing=10)
        
        add_player_btn = Button(text='Add New Player')
        add_player_btn.bind(on_press=lambda x: self.pm.add_player_popup())
        
        data_sync_btn = Button(text='Data Sync')
        data_sync_btn.bind(on_press=lambda x: self.pm.show_data_sync_popup())
        
        bottom_buttons.add_widget(add_player_btn)
        bottom_buttons.add_widget(data_sync_btn)
        
        manage_layout.add_widget(player_list_scroll)
        manage_layout.add_widget(bottom_buttons)

        tab1 = TabbedPanelItem(text='Players')
        tab1.add_widget(manage_layout)
        self.panel.add_widget(tab1)

        # Player Analytics Tab
        self.analytics_screen = PlayerAnalyticsScreen(player_manager=self.pm)
        analytics_tab = TabbedPanelItem(text='Analytics')
        analytics_tab.add_widget(self.analytics_screen)
        self.panel.add_widget(analytics_tab)

        # Match Setup Tab (combines Create + Teams)
        match_setup_layout = self.pm.create_match_setup_layout()
        setup_tab = TabbedPanelItem(text='Match Setup')
        setup_tab.add_widget(match_setup_layout)
        self.panel.add_widget(setup_tab)

        self.scoring_tab = TabbedPanelItem(text='Scoring')
        self.panel.add_widget(self.scoring_tab)

        self.scorecard_screen = ScorecardScreen()
        self.scorecard_tab = TabbedPanelItem(text='Scorecard')
        self.scorecard_tab.add_widget(self.scorecard_screen)
        self.panel.add_widget(self.scorecard_tab)

        self.analysis_screen = AnalysisScreen()
        self.analysis_tab = TabbedPanelItem(text='Game Analysis')
        self.analysis_tab.add_widget(self.analysis_screen)
        self.panel.add_widget(self.analysis_tab)
        self.analysis_tab.disabled = True


        self.pm.refresh_player_list()
        self.pm.update_last_result()
        return self.panel

    def start_scoring(self, batting_team, bowling_team, is_second_innings=False, target_score=None, total_overs=20):
        self.is_second_innings = is_second_innings
        if not is_second_innings:
            self.innings1_data = {}
            self.innings2_data = {}
            self.analysis_tab.disabled = True


        self.scoring_tab.clear_widgets()
        scoring_screen = ScoringScreen(batting_team, bowling_team, scorecard_widget=self.scorecard_screen,
                                       target_score=target_score, total_overs=total_overs)
        self.scoring_tab.add_widget(scoring_screen)
        self.panel.switch_to(self.scoring_tab)

    def start_second_innings(self, batting_team, bowling_team, target_score, total_overs):
        self.start_scoring(batting_team, bowling_team, is_second_innings=True, target_score=target_score,
                           total_overs=total_overs)

    def store_innings_data(self, team_data, batsman_scores, bowler_figures, total_score, total_wickets, over_scores, wicket_events, total_balls_bowled):
        data = {
            'team_data': team_data,
            'batsman_scores': batsman_scores,
            'bowler_figures': bowler_figures,
            'total_score': total_score,
            'total_wickets': total_wickets,
            'over_scores': over_scores,
            'wicket_events': wicket_events,
            'total_balls_bowled': total_balls_bowled
        }
        if not self.is_second_innings:
            self.innings1_data = data
        else:
            self.innings2_data = data

    def finish_and_analyze_match(self):
        if self.innings1_data and self.innings2_data:
            self.analysis_screen.generate_analysis(self.innings1_data, self.innings2_data)
            self.analysis_tab.disabled = False
            self.panel.switch_to(self.analysis_tab)

        content = BoxLayout(orientation='vertical', spacing=10, padding=10)
        content.add_widget(Label(text="Match Finished!\nDo you want to save the scorecard to the database?"))
        buttons = BoxLayout(spacing=10, size_hint_y=None, height=60)
        yes_btn = Button(text='Yes')
        no_btn = Button(text='No')
        buttons.add_widget(yes_btn)
        buttons.add_widget(no_btn)
        content.add_widget(buttons)
        popup = Popup(title="Save Match", content=content, size_hint=(0.8, 0.5), auto_dismiss=False)

        def handle_save(save):
            popup.dismiss()
            if save:
                self.save_match_to_database_safe()

        yes_btn.bind(on_press=lambda x: handle_save(True))
        no_btn.bind(on_press=lambda x: handle_save(False))
        popup.open()


    def _compare_bbi(self, old_bbi, new_wickets, new_runs):
        if old_bbi == '0/0' or not isinstance(old_bbi, str) or '/' not in old_bbi:
            return f"{new_wickets}/{new_runs}"

        old_wickets, old_runs = map(int, old_bbi.split('/'))

        if new_wickets > old_wickets:
            return f"{new_wickets}/{new_runs}"
        elif new_wickets == old_wickets and new_runs < old_runs:
            return f"{new_wickets}/{new_runs}"
        else:
            return old_bbi

    def save_match_to_database(self):
        """DEPRECATED: Excel-based save function. Use save_match_to_database_safe() instead."""
        # This function is kept for backward compatibility but should not be used
        # All new saves should use CSV format via save_match_to_database_safe()
        self.save_match_to_database_safe()

    def save_match_to_database_safe(self):
        """Main method using CSV format and saving to app folder"""
        try:
            from android_safe_data_manager import AndroidSafeDataManager
            data_manager = AndroidSafeDataManager()
            
            # Save match data to local CSV files
            success, message = data_manager.save_match_data_csv(self.innings1_data, self.innings2_data)
            
            if success:
                Popup(title="Success", content=Label(text=message), size_hint=(0.8, 0.6)).open()
                self.innings1_data = {}
                self.innings2_data = {}
            else:
                Popup(title="Save Error", content=Label(text=message), size_hint=(0.8, 0.4)).open()
                
        except Exception as e:
            error_msg = f"Critical error saving match data: {str(e)}"
            Popup(title="Critical Error", content=Label(text=error_msg), size_hint=(0.8, 0.4)).open()


if __name__ == '__main__':
    CricketApp().run()