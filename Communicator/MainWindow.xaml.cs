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
        IConnection Connection;
        public MainWindow()
        {
            InitializeComponent();
        }
        VideoConnection vc = new VideoConnection();
        private void listBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            
        }

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            var db = new CommunicatorContext();
            for (int i = 0; i < 5; i++)
            {
               Contact c = new Contact(i.ToString(), i.ToString(), i.ToString(), i.ToString(), i.ToString());
            }
            //Contact.Contacts.Values.ToList()[2].State = Contact.ContactState.Offline;
            //Contact.Contacts.Values.ToList()[4].State = Contact.ContactState.Offline;
            vc.a = "5";
           

            RefreshLB();
            List<IConnection> Connections = new List<IConnection>();
            Connections.Add(new VideoConnection());
            Connections.Add(new PhoneConnection());
            Connections.Add(new MessageConnection());
            comboBox.ItemsSource = Connections;
        }

        private void comboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            Connection = (IConnection)comboBox.SelectedItem;
        }

        private void button_Click(object sender, RoutedEventArgs e)
        {
            Connection.Connect((Contact)listBox.SelectedItem, (Contact)listBox.SelectedItem);
            MessageBox.Show(vc.a);
        }

        private void Window_Closed(object sender, EventArgs e)
        {
            

        }

        public void RefreshLB()
        {
            var db = new CommunicatorContext();
            var query = from c in db.Contacts
                        orderby c.Name
                        select c;



            listBox.ItemsSource = query.ToList();
        }


        private void button_delete_Click(object sender, RoutedEventArgs e)
        {
            var db = new CommunicatorContext();
            db.DeleteObjectFromDB((Contact)listBox.SelectedItem);
            RefreshLB();
        }
    }
}
