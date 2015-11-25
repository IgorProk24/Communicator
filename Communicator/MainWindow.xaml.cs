using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using TheCommunicatorLibrary;
using System.Data.Entity;

namespace Communicator
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        VideoConnection vc = new VideoConnection();
        IConnection connection;

        public MainWindow()
        {
            InitializeComponent();
        }

        public void RefreshLB()
        {
            var db = new CommunicatorContext();
            var query = from c in db.Contacts
                        orderby c.Name
                        select c;

            listBox.ItemsSource = query.ToList();
        }

        private void ListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            
        }

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            var db = new CommunicatorContext();
            for (int i = 0; i < 5; i++)
            {
               Contact c = new Contact(i.ToString(), i.ToString(), i.ToString(), i.ToString(), i.ToString());
            }

            vc.A = "5";

            RefreshLB();
            List<IConnection> connections = new List<IConnection>();
            connections.Add(new VideoConnection());
            connections.Add(new PhoneConnection());
            connections.Add(new MessageConnection());
            comboBox.ItemsSource = connections;
        }

        private void ComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            connection = (IConnection)comboBox.SelectedItem;
        }

        private void Button_Click(object sender, RoutedEventArgs e)
        {
            connection.Connect((Contact)listBox.SelectedItem, (Contact)listBox.SelectedItem);
            MessageBox.Show(vc.A);
        }

        private void Window_Closed(object sender, EventArgs e)
        {

        }

        private void Button_delete_Click(object sender, RoutedEventArgs e)
        {
            var db = new CommunicatorContext();
            db.DeleteObjectFromDB((Contact)listBox.SelectedItem);
            RefreshLB();
        }
    }
}
